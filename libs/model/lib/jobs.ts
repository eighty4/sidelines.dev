import type { BranchRef, RepoNameWithOwner, RepositoryId } from './repo.ts'

const JobKinds = ['scheduled', 'repos', 'syncedRefs'] as const

export type JobKind = (typeof JobKinds)[number]

export function isJobKind(v: unknown): v is JobKind {
    return (
        typeof v === 'string' &&
        (JobKinds as Readonly<Array<string>>).includes(v)
    )
}

export type JobId = `JOB_${JobKind}_${string}`

// union of completion states for jobs
export type JobExecState =
    | {
          kind: 'schedule'
      }
    | RepoJobExecState
    | SyncedRefsJobExecState

/*****************/
/*** REPO JOBS ***/
/*****************/

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

// completion state of a job execution
// saved to db with JobLogRecord
export type RepoJobExecState = {
    kind: 'repo'
    target: RepoJobTarget
    repos: Record<RepoNameWithOwner, RepoJobExecStatus>
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

// result of job on a repo
export type RepoJobExecStatus =
    | RepoJobExecResultDone
    | RepoJobExecResultFailed
    | RepoJobExecResultException
    | RepoJobExecResultCommitReview
    | RepoJobExecResultCommitMerged

export type RepoJobExecResultDone = {
    state: 'done'
    when: Date
}

export type RepoJobExecResultFailed = {
    state: 'failed'
    when: Date
    error: string
}

export type RepoJobExecResultException = {
    state: 'exception'
    when: Date
    error: string
    message?: string
    stack?: string
}

export type RepoJobExecResultCommitReview = {
    state: 'review'
    when: Date
    commitId: string
}

export type RepoJobExecResultCommitMerged = {
    state: 'merged'
    when: Date
    sha: string
}

/************************/
/*** SYNCED REFS JOBS ***/
/************************/

// completion state of a job execution
// saved to db with JobLogRecord
export type SyncedRefsJobExecState = {
    kind: 'refs'
    repos: Record<RepoNameWithOwner, SyncedRefsJobExecStatus>
}

// result of job on a repo's synced refs
export type SyncedRefsJobExecStatus = {}

/**************************/
/*** REPO COMMIT REVIEW ***/
/**************************/

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
