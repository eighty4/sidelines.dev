import type { RepoJobId } from '@sidelines/model'

// initializing shared worker message posted from startJobsSWorker to initialize JobsSWorker
export type JobSchedulingRequest = {
    kind: 'INIT'
    ghToken: string
    pageId: string
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
    return new BroadcastChannel(`sidelines.job.api.${kind}.${channelId}`)
}
