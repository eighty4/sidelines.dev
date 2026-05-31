import {
    isMessageObject,
    type RepoJobExecStatus,
    type RepositoryId,
} from '@sidelines/model'

export type JobWorkerUpdateMessage =
    | {
          kind: 'status'
          jobKind: 'repo'
          jobExecId: string
          repo: RepositoryId
          status: RepoJobExecStatus
      }
    | {
          kind: 'complete'
          jobKind: 'repo'
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
            case 'status':
                return (
                    'jobKind' in data &&
                    'jobExecId' in data &&
                    'repo' in data &&
                    'status' in data
                )
            case 'complete':
                return 'jobKind' in data && 'jobExecId' in data
        }
    }
    return false
}
