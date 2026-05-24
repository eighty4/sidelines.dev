import {
    ChannelDataSubscription,
    type DataCallback,
    type RepoJobExecUpdate,
    type RepoJobId,
    type RepoJobSpec,
} from '@sidelines/model'
import {
    createChannel,
    type JobApiRequest,
    type JobListingUpdate,
} from './jobMessaging.ts'
import startJobSchedulingWorker from './startJobsSWorker.ts'

export default class JobApiClient {
    static availableJobs(): Array<RepoJobSpec> {
        return [
            {
                jobId: 'UPGRADE_ACTIONS',
                label: 'Upgrade Workflow Actions',
            },
        ]
    }
    #sw: SharedWorker

    constructor(ghToken: string) {
        this.#sw = startJobSchedulingWorker(ghToken)
        // todo close channels in sw
        // window.addEventListener('beforeunload', () => {
        // })
    }

    exec(
        jobId: RepoJobId,
        cb: DataCallback<RepoJobExecUpdate>,
    ): ChannelDataSubscription<RepoJobExecUpdate> {
        const channelId = crypto.randomUUID()
        const channel = createChannel('EXEC', channelId)
        this.#sw.port.postMessage({
            kind: 'EXEC',
            channelId,
            jobId: jobId,
        } satisfies JobApiRequest)
        return new ChannelDataSubscription(channel, cb)
    }

    ls(
        cb: DataCallback<JobListingUpdate>,
    ): ChannelDataSubscription<JobListingUpdate> {
        const channelId = crypto.randomUUID()
        const channel = createChannel('LS', channelId)
        this.#sw.port.postMessage({
            kind: 'LS',
            channelId,
        } satisfies JobApiRequest)
        return new ChannelDataSubscription(channel, cb)
    }
}
