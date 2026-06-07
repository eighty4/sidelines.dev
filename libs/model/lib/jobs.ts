import type { BranchRef, RepositoryId } from './repo.ts'

const JobKinds = ['scheduled', 'repos', 'syncedRefs'] as const

export type JobKind = (typeof JobKinds)[number]

export function isJobKind(v: unknown): v is JobKind {
    return (
        typeof v === 'string' &&
        (JobKinds as Readonly<Array<string>>).includes(v)
    )
}

export type JobId = `JOB_${JobKind}_${string}`

export type RepoJobId = `JOB_repos_${string}`

export type RepoJobSpec = {
    jobId: RepoJobId
    label: string
}

export type RepoJobExecUpdate = {
    jobId: RepoJobId
    jobExecId: string
    status: RepoJobExecStatus
}

// defines scope of a repo job
// dispatched to a repo job from the jobs backend
// in `@sidelines/model` because it is saved to IndexedDB job logging
export type RepoJobTarget =
    | {
          repos: 'single'
          repo: RepositoryId
      }
    | {
          repos: 'owner'
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
      }
    | {
          state: 'exception'
          when: Date
          error: string
          message?: string
          stack?: string
      }
    | {
          state: 'review'
          when: Date
          commitId: string
      }

export type SyncedRefsJobExecStatus = {}

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
