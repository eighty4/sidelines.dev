import { type RepoNameWithOwner } from '@sidelines/model'
import type { JobIdForJobKind } from '@sidelines/model/jobs/id'
import type { JobKind } from '@sidelines/model/jobs/kind'
import type {
    RepoJobExecResult,
    SyncedRefsJobExecResult,
} from '@sidelines/model/jobs/result'
import {
    isJobKind,
    isMessageObject,
    isRepoName,
    isString,
} from '@sidelines/model/validate'

export type JobWorkerUpdate =
    RepoJobWorkerUpdate | ScheduledJobWorkerUpdate | SyncedRefsJobWorkerUpdate

type JobWorkerUpdateCommon<JK extends JobKind> = {
    kind: string
    jobKind: JK
    jobId: JobIdForJobKind<JK>
    jobExecId: string
}

export type RepoJobWorkerUpdate =
    | JobWorkerUpdateStarting<'repos'>
    | RepoJobWorkerUpdateStatus
    | JobWorkerUpdateComplete<'repos'>

export type JobWorkerUpdateStarting<JK extends JobKind> =
    JobWorkerUpdateCommon<JK> & {
        kind: 'starting'
    }

export type JobWorkerUpdateComplete<JK extends JobKind> =
    JobWorkerUpdateCommon<JK> & {
        kind: 'complete'
    }

export type RepoJobWorkerUpdateStatus = JobWorkerUpdateCommon<'repos'> & {
    kind: 'status'
    repo: RepoNameWithOwner
    status: RepoJobExecResult
}

export type ScheduledJobWorkerUpdate =
    JobWorkerUpdateStarting<'scheduled'> | JobWorkerUpdateComplete<'scheduled'>

export type SyncedRefsJobWorkerUpdate =
    | JobWorkerUpdateStarting<'syncedRefs'>
    | SyncedRefsJobWorkerUpdateStatus
    | JobWorkerUpdateComplete<'syncedRefs'>

export type SyncedRefsJobWorkerUpdateStatus =
    JobWorkerUpdateCommon<'syncedRefs'> & {
        kind: 'status'
        repo: RepoNameWithOwner
        status: SyncedRefsJobExecResult
    }

export function isJobWorkerUpdate(data: unknown): data is JobWorkerUpdate {
    if (
        isMessageObject(data) &&
        isJobKind(data.jobKind) &&
        isString(data.jobExecId)
    ) {
        if (isString(data.kind)) {
            switch (data.kind) {
                case 'starting':
                case 'complete':
                    return true
                case 'status':
                    return isRepoName(data.repo) && 'status' in data
            }
        }
    }
    return false
}
