import type {
    BranchRef,
    RepoNameWithOwner,
    RepositoryId,
    RepositoryPackage,
} from '@sidelines/model'
import type {
    RepoCommitAddition,
    RepoCommitDeletion,
    RepoCommitInputs,
} from '@sidelines/model/commits'
import type { JobIdForJobKind, ScheduledJobId } from '@sidelines/model/jobs/id'
import type { JobKind } from '@sidelines/model/jobs/kind'
import type { JobExecState } from '@sidelines/model/jobs/state'
import type { ViewerRepoUserContext } from './transactions/repoContext.ts'

/**
 * Exporting IndexedDB record types for testing with Playwright.
 * Ideally, an esbuild plugin checking for this import
 * outside of `tests` directory should fail CI.
 */

// DB_STORE_COMMIT_REVIEW
export type CommitReviewRecord = {
    // DB_STORE_COMMIT_REVIEW_KEY
    reviewId: string

    nameWithOwner: RepoNameWithOwner
    additions: Array<Omit<RepoCommitAddition, 'content'>> | null
    deletions: Array<RepoCommitDeletion> | null
} & Pick<RepoCommitInputs, 'branch' | 'commitMessage'>

// DB_STORE_JOB_LOG
export type JobLogRecord<JK extends JobKind = JobKind> = {
    // DB_STORE_JOB_LOG_KEY
    jobExecId: string

    jobKind: JK
    jobId: JobIdForJobKind<JK>
    whenInit: Date
    whenDone: Date | null
} & JobExecState<JK>

// DB_STORE_JOB_SCHEDULING
export type JobSchedulingRecord = {
    // DB_STORE_JOB_SCHEDULING_KEY
    jobId: ScheduledJobId

    whenInit: Date
    completed: true | null
}

// DB_STORE_READ_WATCHES
export type ReadingWatchRecord = {
    // DB_STORE_READ_WATCHES_KEY
    nameWithOwner: RepoNameWithOwner
    path: string

    repo: RepositoryId
}

// DB_STORE_REPO_CONTEXT
export type RepoContextRecord = {
    // DB_STORE_REPO_CONTEXT_KEY
    nameWithOwner: RepoNameWithOwner

    userContext: ViewerRepoUserContext
}

// DB_STORE_REPO_HEADS
export type RepoHeadRecord = {
    // DB_STORE_REPO_HEADS_KEY
    repo: RepoNameWithOwner

    defaultBranch: BranchRef
}

// DB_STORE_REPO_NAV
export type RepoNavRecord = {
    // DB_STORE_REPO_NAV_KEY
    nameWithOwner: RepoNameWithOwner

    repo: RepositoryId // todo remove
    when: Date
}

// DB_STORE_REPO_PACKAGES
export type RepoPackagesRecord = {
    // DB_STORE_REPO_PACKAGES_KEY
    nameWithOwner: RepoNameWithOwner
    defaultBranch: string
    headOid: string

    committedWhen: Date
    packages: Array<RepositoryPackage>
}
