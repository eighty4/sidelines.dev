import {
    createChannel,
    type JobApiRequest,
    type JobExecUpdate,
    type JobListingUpdate,
    type JobSpec,
} from './jobMessaging.ts'
import startJobSchedulingWorker from './startJobsSWorker.ts'

export type OnJobMessage<T> = (update: T) => Promise<void> | void

export type JobMessaging<T> = {
    set onUpdate(cb: OnJobMessage<T>)
    close(): void
}

export default class JobApiClient {
    #sw: SharedWorker

    constructor(ghToken: string) {
        this.#sw = startJobSchedulingWorker(ghToken)
        // todo close channels in sw
        // window.addEventListener('beforeunload', () => {
        // })
    }

    exec(job: JobSpec): JobMessaging<JobExecUpdate> {
        const channelId = crypto.randomUUID()
        const channel = createChannel('EXEC', channelId)
        this.#sw.port.postMessage({
            kind: 'EXEC',
            channelId,
            jobId: job.id,
        } satisfies JobApiRequest)
        return {
            set onUpdate(cb: OnJobMessage<JobExecUpdate>) {
                channel.onmessage = e => cb(e.data)
            },
            close: () => channel.close(),
        }
    }

    ls(): JobMessaging<JobListingUpdate> {
        const channelId = crypto.randomUUID()
        const channel = createChannel('LS', channelId)
        this.#sw.port.postMessage({
            kind: 'LS',
            channelId,
        } satisfies JobApiRequest)
        return {
            set onUpdate(cb: OnJobMessage<JobListingUpdate>) {
                channel.onmessage = e => cb(e.data)
            },
            close: () => channel.close(),
        }
    }
}
