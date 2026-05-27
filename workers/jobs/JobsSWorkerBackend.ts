import { createRepoJobRecord } from '@sidelines/data/tx/jobLog'
import type { RepoJobId } from '@sidelines/model'
import { ulid } from 'ulid'
import {
    SharedWorkerSideWorkerLauncher,
    type WorkerLaunchId,
} from '../WorkerLaunch.ts'
import {
    createChannel,
    type JobApiRequest,
    type JobListingUpdate,
} from './jobMessaging.ts'
import type { ExecJobWorkerRequest } from './ExecJobWorker.ts'

function workerLaunchId(jobId: RepoJobId): WorkerLaunchId {
    switch (jobId) {
        case 'UPGRADE_ACTIONS':
            return 'JOB_upgradeWorkflowActions'
    }
}

export default class JobsBackend {
    #channels: Record<JobApiRequest['kind'], Array<BroadcastChannel>> = {
        EXEC: [],
        LS: [],
    }
    #ghToken: string
    #launcher: SharedWorkerSideWorkerLauncher =
        new SharedWorkerSideWorkerLauncher()

    get ghToken(): string {
        return this.#ghToken
    }

    constructor(ghToken: string) {
        this.#ghToken = ghToken
    }

    exec(channelId: string, jobId: RepoJobId) {
        console.log('job exec request')
        this.#createChannel('EXEC', channelId)
        // todo create a record of job in database
        const jobExecId = ulid()
        createRepoJobRecord(jobId, jobExecId)
            .then(() => {
                this.#launcher.request(workerLaunchId(jobId), {
                    kind: 'EXEC',
                    ghToken: this.#ghToken,
                    jobExecId,
                } satisfies ExecJobWorkerRequest)
            })
            .catch(e => {
                console.error('JobSWorkerBackend error initializing exec', e)
            })
    }

    ls(channelId: string) {
        throw Error()
        console.log('job ls request', this.#channels.LS.length)
        this.#createChannel('LS', channelId)
        const update: JobListingUpdate = {}
        this.#postJobListingUpdate(update)
    }

    ghTokenChanged(ghToken: string): boolean {
        return this.ghToken !== ghToken
    }

    shutdown() {
        for (const channels of Object.values(this.#channels)) {
            for (const channel of channels) {
                channel.close()
            }
        }
    }

    // #channel(kind: JobApiRequest['kind'], channelId: string): BroadcastChannel | undefined {
    //     return this.#channels[kind].find(c => c.name.endsWith(channelId))
    // }

    #createChannel(kind: JobApiRequest['kind'], channelId: string) {
        const channel = createChannel(kind, channelId)
        this.#channels[kind].push(channel)
    }

    #postJobListingUpdate(update: JobListingUpdate) {
        for (const c of this.#channels['LS']) {
            c.postMessage(update)
        }
    }
}
