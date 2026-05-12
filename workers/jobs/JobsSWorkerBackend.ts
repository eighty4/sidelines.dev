import {
    createChannel,
    type JobApiRequest,
    type JobListingUpdate,
    type JobSpec,
} from './jobMessaging.ts'
import { SharedWorkerSideWorkerLauncher } from '../WorkerLaunch.ts'
import type { ExecJobWorkerRequest } from './ExecJobWorker.ts'

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

    exec(channelId: string) {
        console.log('job exec request')
        this.#createChannel('EXEC', channelId)
        // todo create a record of job in database
        const jobExecId = crypto.randomUUID()
        this.#launcher.request('JOB_upgradeWorkflowActions', {
            kind: 'EXEC',
            ghToken: this.#ghToken,
            jobExecId,
        } satisfies ExecJobWorkerRequest)
    }

    ls(channelId: string) {
        console.log('job ls request', this.#channels.LS.length)
        this.#createChannel('LS', channelId)
        fetchJobsConfig().then(jobs => {
            const update: JobListingUpdate = {
                available: jobs,
            }
            this.#postJobListingUpdate(update)
        })
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

type JobSpecBackend = JobSpec & {
    url: string
}

type JobSpecJson = Record<string, Omit<JobSpecBackend, 'id'>>

async function fetchJobsConfig(): Promise<Array<JobSpecBackend>> {
    const request = await fetch('/jobs.json')
    const json: JobSpecJson = await request.json()
    return Object.entries(json).map(([id, { label, url }]) => ({
        id,
        label,
        url,
    }))
}
