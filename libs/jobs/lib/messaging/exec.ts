import type { RepoNameWithOwner } from '@sidelines/model'
import {
    isArray,
    isMessageObject,
    isRepoName,
    isString,
} from '@sidelines/model/validate'

export type ExecJobMessage = {
    kind: 'EXEC'
    ghToken: string
    jobExecId: string
}

export type ExecRepoJobMessage = ExecJobMessage & {
    repos: Array<RepoNameWithOwner>
}

export type ExecSyncedRefsJobMessage = ExecJobMessage & {}

export function isExecRepoJobMessage(
    data: unknown,
): data is ExecRepoJobMessage {
    return isExecJobMessage(data) && isArray(data.repos, isRepoName)
}

export function isExecSyncedRefsJobMessage(
    data: unknown,
): data is ExecSyncedRefsJobMessage {
    return isExecJobMessage(data)
}

function isExecJobMessage(
    data: unknown,
): data is ExecJobMessage & { [key: string]: unknown } {
    if (!isMessageObject(data)) {
        return false
    }
    switch (data.kind) {
        case 'EXEC':
            return isString(data.ghToken) && isString(data.jobExecId)
        default:
            console.warn('ExecJobMessage invalid', data.kind)
            return false
    }
}
