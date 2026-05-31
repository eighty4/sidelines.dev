import {
    createRepoJobLog,
    markJobDone,
    markRepoJobStatus,
} from '@sidelines/data/tx/jobLog'
import {
    createUpdateChannel,
    isJobWorkerUpdateMessage,
    type ExecRepoJobMessage,
} from '@sidelines/jobs/messaging'
import type { RepoJobId, RepositoryId } from '@sidelines/model'
import { ulid } from 'ulid'
import {
    SharedWorkerSideWorkerLauncher,
    type WorkerLaunchId,
} from '../WorkerLaunch.ts'
import { createJobApiChannel, type JobApiRequest } from './jobApiMessaging.ts'

function workerLaunchId(jobId: RepoJobId): WorkerLaunchId {
    switch (jobId) {
        case 'UPGRADE_ACTIONS':
            return 'JOB_REPO_upgradeWorkflowActions'
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
    #updates: BroadcastChannel = createUpdateChannel()

    get ghToken(): string {
        return this.#ghToken
    }

    constructor(ghToken: string) {
        this.#ghToken = ghToken
        this.#updates.onmessage = this.#onJobUpdate
    }

    exec(channelId: string, jobId: RepoJobId, repo?: RepositoryId) {
        console.log('job exec request')
        this.#createChannel('EXEC', channelId)
        const jobExecId = ulid()
        const target: ExecRepoJobMessage['target'] = repo
            ? { repos: 'single', repo }
            : { repos: 'owner' }
        createRepoJobLog(jobId, jobExecId, target)
            .then(() => {
                this.#launcher.request(workerLaunchId(jobId), {
                    kind: 'EXEC',
                    ghToken: this.#ghToken,
                    jobExecId,
                    target,
                } satisfies ExecRepoJobMessage)
            })
            .catch((e: unknown) => {
                console.error('JobSWorkerBackend error initializing exec', e)
            })
    }

    ls(_channelId: string) {
        throw Error()
    }

    hasGhTokenChanged(ghToken: string): boolean {
        return this.ghToken !== ghToken
    }

    shutdown() {
        for (const channels of Object.values(this.#channels)) {
            for (const channel of channels) {
                channel.close()
            }
        }
    }

    #createChannel(kind: JobApiRequest['kind'], channelId: string) {
        const channel = createJobApiChannel(kind, channelId)
        this.#channels[kind].push(channel)
    }

    async #onJobUpdate(e: MessageEvent<unknown>) {
        if (!isJobWorkerUpdateMessage(e.data)) {
            console.warn(
                'JobsSWorker update channel invalid JobWorkerUpdateMessage',
                e.data,
            )
            return
        }
        switch (e.data.jobKind) {
            case 'repo':
                switch (e.data.kind) {
                    case 'status':
                        await markRepoJobStatus(
                            e.data.jobExecId,
                            e.data.repo,
                            e.data.status,
                        )
                        break
                    case 'complete':
                        await markJobDone(e.data.jobExecId)
                        break
                }
                break
            default:
                throw Error('todo')
        }
    }
}
