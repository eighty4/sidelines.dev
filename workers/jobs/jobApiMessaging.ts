import type { RepositoryId } from '@sidelines/model'
import { makeChannel } from '@sidelines/model/channels'
import type { RepoJobId } from '@sidelines/model/jobs/id'
import {
    isMessageObject,
    isOptionalRepoId,
    isString,
} from '@sidelines/model/validate'

// initializing shared worker message posted from startJobsSWorker to initialize JobsSWorker
export type JobInitRequest = {
    kind: 'INIT'
    ghToken: string
}

export function isJobInitRequest(req: unknown): req is JobInitRequest {
    if (!isMessageObject(req)) return false
    switch (req.kind) {
        case 'INIT':
            return isString(req.ghToken)
    }
    return false
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

export function isJobApiRequest(req: unknown): req is JobApiRequest {
    if (!isMessageObject(req)) return false
    switch (req.kind) {
        case 'LS':
            return isString(req.channelId)
        case 'EXEC':
            return (
                isString(req.channelId) &&
                isString(req.jobId) &&
                isOptionalRepoId(req.repo)
            )
    }
    return false
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
