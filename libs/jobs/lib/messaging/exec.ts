import { isMessageObject, type RepoNameWithOwner } from '@sidelines/model'

export type ExecJobMessage = {
    kind: 'EXEC'
    ghToken: string
    jobExecId: string
}

export type ExecRepoJobMessage = ExecJobMessage & {
    repos: Array<RepoNameWithOwner>
}

export type ExecSyncedRefsJobMessage = ExecJobMessage & {}

function isExecJobMessage(data: unknown): data is ExecJobMessage {
    if (!isMessageObject(data)) {
        return false
    }
    switch (data.kind) {
        case 'EXEC':
            return (
                'ghToken' in data &&
                typeof data.ghToken === 'string' &&
                'jobExecId' in data &&
                typeof data.jobExecId === 'string'
            )
        default:
            console.warn('ExecJobMessage invalid', data.kind)
            return false
    }
}

export function isExecRepoJobMessage(
    data: unknown,
): data is ExecRepoJobMessage {
    if (!isExecJobMessage(data)) {
        return false
    }
    return true
}

export function isExecSyncedRefsJobMessage(
    data: unknown,
): data is ExecSyncedRefsJobMessage {
    if (!isExecJobMessage(data)) {
        return false
    }
    return true
}
