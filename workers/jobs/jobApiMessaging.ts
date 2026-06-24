import type { RepoJobId, RepositoryId } from '@sidelines/model'
import { makeChannel } from '@sidelines/model/channels'

// initializing shared worker message posted from startJobsSWorker to initialize JobsSWorker
export type JobSchedulingRequest = {
    kind: 'INIT'
    ghToken: string
}

// api messages posted from JobApiClient to JobSWorker
export type JobApiRequest =
    | {
          kind: 'LS'
          channelId: string
      }
    | {
          kind: 'EXEC'
          jobId: RepoJobId
          channelId: string
          repo?: RepositoryId
      }

// LS operation updates posted to client's channel
export type JobListingUpdate = {
    running?: Array<{
        jobId: RepoJobId
        jobExecId: string
        whenStarted: Date
    }>
}

// EXEC operation updates posted to client's channel
export type JobExecUpdate = {
    jobId: RepoJobId
    jobExecId: string
}

export function createJobApiChannel(
    kind: JobApiRequest['kind'],
    channelId: string,
): BroadcastChannel {
    return makeChannel(`sidelines.job.api.${kind}.${channelId}`)
}
