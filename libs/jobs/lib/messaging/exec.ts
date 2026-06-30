import type {
    JobIdForJobKind,
    JobKind,
    RepoNameWithOwner,
    SyncedRefsData,
} from '@sidelines/model'
import {
    isArray,
    isDate,
    isJobId,
    isMessageObject,
    isRepoName,
    isString,
    isUndefined,
} from '@sidelines/model/validate'

export type ExecJobMessage<JK extends JobKind> = {
    kind: 'EXEC'
    ghToken: string
    jobId: JobIdForJobKind<JK>
    jobExecId: string
}

export type ExecRepoJobMessage = ExecJobMessage<'repos'> & {
    repos: Array<RepoNameWithOwner>
}

export function isExecRepoJobMessage(
    data: unknown,
): data is ExecRepoJobMessage {
    return isExecJobMessage(data) && isArray(data.repos, isRepoName)
}

export type ExecSyncedRefsJobMessage = ExecJobMessage<'syncedRefs'> & {
    repos: Record<RepoNameWithOwner, SyncedRefsData>
}

export function isExecSyncedRefsJobMessage(
    data: unknown,
): data is ExecSyncedRefsJobMessage {
    return isExecJobMessage(data)
}

export type ExecScheduledJobMessage = ExecJobMessage<'scheduled'> & {
    lastRan?: Date
}

export function isExecScheduledJobMessage(
    data: unknown,
): data is ExecScheduledJobMessage {
    return (
        isExecJobMessage(data) &&
        (isUndefined(data.lastRan) || isDate(data.lastRan))
    )
}

function isExecJobMessage(
    data: unknown,
): data is ExecJobMessage<any> & { [key: string]: unknown } {
    if (!isMessageObject(data)) {
        return false
    }
    switch (data.kind) {
        case 'EXEC':
            return (
                isJobId(data.jobId) &&
                isString(data.ghToken) &&
                isString(data.jobExecId)
            )
        default:
            console.warn('ExecJobMessage invalid', data.kind)
            return false
    }
}
