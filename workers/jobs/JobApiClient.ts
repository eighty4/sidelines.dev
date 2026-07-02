import {
    ChannelDataSubscription,
    type DataCallback,
    type RepositoryId,
} from '@sidelines/model'
import type { RepoJobId } from '@sidelines/model/jobs/id'
import type { RepoJobSpec } from '@sidelines/model/jobs/spec'
import type { RepoJobExecUpdate } from '@sidelines/model/jobs/updates'
import {
    createJobApiChannel,
    type JobApiRequest,
    type JobListingUpdate,
} from './jobApiMessaging.ts'
import startJobSchedulingWorker from './startJobsSWorker.ts'

export default class JobApiClient {
    // todo use AvailableJobsReq/Res for available job data in UI
    // do not req on BroadcastChannel because SharedWorker might not be up in time
    // use SharedWorker postMessage and onmessage to guarantee delivery and processing
    static availableJobs(): Array<RepoJobSpec> {
        return [
            {
                jobId: 'JOB_repos_UPGRADE_ACTIONS',
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
        repo?: RepositoryId,
    ): ChannelDataSubscription<RepoJobExecUpdate> {
        const channelId = crypto.randomUUID()
        const channel = createJobApiChannel('EXEC', channelId)
        this.#sw.port.postMessage({
            kind: 'EXEC',
            channelId,
            jobId,
            repo,
        } satisfies JobApiRequest)
        return new ChannelDataSubscription(channel, cb)
    }

    ls(
        cb: DataCallback<JobListingUpdate>,
    ): ChannelDataSubscription<JobListingUpdate> {
        const channelId = crypto.randomUUID()
        const channel = createJobApiChannel('LS', channelId)
        this.#sw.port.postMessage({
            kind: 'LS',
            channelId,
        } satisfies JobApiRequest)
        return new ChannelDataSubscription(channel, cb)
    }
}
