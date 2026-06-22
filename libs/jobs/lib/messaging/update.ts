import {
    isJobKind,
    isMessageObject,
    type RepoJobExecStatus,
    type RepoNameWithOwner,
} from '@sidelines/model'

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
                return (
                    'jobKind' in data &&
                    isJobKind(data.jobKind) &&
                    'jobExecId' in data &&
                    typeof data.jobExecId === 'string'
                )
            case 'status':
                return (
                    'jobKind' in data &&
                    isJobKind(data.jobKind) &&
                    'jobExecId' in data &&
                    typeof data.jobExecId === 'string' &&
                    'repo' in data &&
                    typeof data.repo === 'string' &&
                    'status' in data
                )
            case 'complete':
                return (
                    'jobKind' in data &&
                    isJobKind(data.jobKind) &&
                    'jobExecId' in data &&
                    typeof data.jobExecId === 'string'
                )
        }
    }
    return false
}
