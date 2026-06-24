import {
    type RepoJobExecStatus,
    type RepoNameWithOwner,
} from '@sidelines/model'
import {
    isMessageObject,
    isJobKind,
    isString,
    isRepoName,
} from '@sidelines/model/validate'

export type JobWorkerUpdateMessage =
    | {
          kind: 'starting'
          jobKind: 'repos'
          jobExecId: string
      }
    | {
          kind: 'status'
          jobKind: 'repos'
          jobExecId: string
          repo: RepoNameWithOwner
          status: RepoJobExecStatus
      }
    | {
          kind: 'complete'
          jobKind: 'repos'
          jobExecId: string
      }

export function isJobWorkerUpdateMessage(
    data: unknown,
): data is JobWorkerUpdateMessage {
    if (!isMessageObject(data)) {
        return false
    }
    if ('kind' in data) {
        switch (data.kind) {
            case 'starting':
                return isJobKind(data.jobKind) && isString(data.jobExecId)
            case 'status':
                return (
                    isJobKind(data.jobKind) &&
                    isString(data.jobExecId) &&
                    isRepoName(data) &&
                    'status' in data
                )
            case 'complete':
                return isJobKind(data.jobKind) && isString(data.jobExecId)
        }
    }
    return false
}
