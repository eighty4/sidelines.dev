import type { RepoJobId } from '@sidelines/model'

// from JobApiClient to JobSWorker(Backend)
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

export type JobListingUpdate = {
    running?: Array<{
        jobId: RepoJobId
        jobExecId: string
        whenStarted: Date
    }>
}

export type JobExecUpdate = {
    jobId: RepoJobId
    jobExecId: string
}

export type JobSchedulingRequest = {
    kind: 'INIT'
    ghToken: string
    pageId: string
}

export function createChannel(
    kind: JobApiRequest['kind'],
    channelId: string,
): BroadcastChannel {
    return new BroadcastChannel(`sidelines.jobs.${kind}.${channelId}`)
}
