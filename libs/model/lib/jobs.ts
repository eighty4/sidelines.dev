import type { BranchRef, RepositoryId } from './repo.ts'

export const RepoJobIds = ['UPGRADE_ACTIONS'] as const

export type RepoJobId = (typeof RepoJobIds)[number]

export type RepoJobSpec = {
    jobId: RepoJobId
    label: string
}

export type RepoJobWorkflowUpgradeActions = 'UPGRADE_ACTIONS'

export type RepoJobExecUpdate = {
    jobId: RepoJobId
    jobExecId: string
    status: RepoJobExecStatus
}

export type RepoJobExecStatus =
    | {
          state: 'done'
          when: Date
      }
    | {
          state: 'error'
          when: Date
          error: string
          stack: string
      }
    | {
          state: 'review'
          commitId: string
          when: Date
      }

export type SyncedRefsJobExecStatus = {}

// export type RepoSyncRefsReason = 'project' | 'watch'

export type RepoCommitReview = {
    id: string
    commit: RepoCommitInputs
}

export type RepoCommitInputs = {
    repo: RepositoryId
    commitMessage: string
    branch: Pick<BranchRef, 'name' | 'headOid'>
    additions?: Array<RepoCommitAddition>
    deletions?: Array<RepoCommitDeletion>
}

export type RepoCommitAddition = {
    dirpath: string
    filename: string
    content: string
}

export type RepoCommitDeletion = {
    dirpath: string
    filename: string
}
