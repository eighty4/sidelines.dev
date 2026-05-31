import { isMessageObject } from '@sidelines/model'

export type ExecJobMessage = {
    kind: 'EXEC'
    ghToken: string
    jobExecId: string
}

export type ExecRepoJobMessage = ExecJobMessage & {}

export type ExecSyncedRefsJobMessage = ExecJobMessage & {}

function isExecJobMessage(data: unknown): data is ExecJobMessage {
    if (!isMessageObject(data)) {
        return false
    }
    switch (data.kind) {
        case 'EXEC':
            return true
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
