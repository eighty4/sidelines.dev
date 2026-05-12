export type JobApiRequest =
    | {
          kind: 'LS'
          channelId: string
      }
    | {
          kind: 'EXEC'
          jobId: string
          channelId: string
      }

export type JobListingUpdate = {
    // temp mapping jobId to jobExecId
    running?: Record<string, string>
    available: Array<JobSpec>
}

export type JobExecUpdate = {
    jobId: string
    jobExecId: string
}

export type JobSchedulingRequest = {
    kind: 'INIT'
    ghToken: string
    pageId: string
}

export type JobSpec = {
    id: string
    label: string
}

export function createChannel(
    kind: JobApiRequest['kind'],
    channelId: string,
): BroadcastChannel {
    return new BroadcastChannel(`sidelines.jobs.${kind}.${channelId}`)
}
