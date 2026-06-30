import type { BranchRef, RepoNameWithOwner, RepositoryId } from './repo.ts'

export const JobKinds = ['scheduled', 'repos', 'syncedRefs'] as const

export type JobKind = (typeof JobKinds)[number]

export type JobId = `JOB_${JobKind}_${string}`

type JobIdFormat<T extends string> = T extends JobId ? T : never

export type JobIdForJobKind<JK extends JobKind> = JK extends 'repos'
    ? RepoJobId
    : JK extends 'scheduled'
      ? ScheduledJobId
      : SyncedRefsJobId

/***************************************************/
/*** Requesting available jobs from jobs backend ***/
/***************************************************/

// syncedRefs jobs use SidelinesJobDataCN to retrieve AvailableJobs<'syncedRefs'>
// Pages use JobApiClient to retrieve jobs to execute

// JobKind excluding `scheduled`
export type JobKindForAvailableJobs<JK extends JobKind = JobKind> =
    JK extends 'scheduled' ? never : JK

export type AvailableJob<JK extends JobKindForAvailableJobs> = {
    jobId: JobIdForJobKind<JK>
    critiera?: Partial<Record<AvailableJobCriterion, boolean>>
}

export const AvailableJobCriteria = ['watch'] as const

export type AvailableJobCriterion = (typeof AvailableJobCriteria)[number]

export type AvailableJobsReq<JK extends JobKindForAvailableJobs> = {
    jobKind: JK
}

export type AvailableJobsRes<JK extends JobKindForAvailableJobs> = {
    jobs: Array<AvailableJob<JK>>
}

/****************************************************/
/*** Tracking job parameters and completion state ***/
/****************************************************/

export type JobExecState<JK extends JobKind = JobKind> = JK extends JobKind
    ? { jobKind: JK } & JobExecStates[JK]
    : never

type JobExecStates = {
    repos: {
        repos: Record<RepoNameWithOwner, RepoJobExecResult>
        target: RepoJobTarget
        whenLastActivity: Date | null
    }
    scheduled: {}
    syncedRefs: {
        repos: Record<RepoNameWithOwner, SyncedRefsState>
        whenLastActivity: Date | null
    }
}

export type SyncedRefsData = {
    from?: BranchRef
    to: BranchRef
}

export type SyncedRefsState = SyncedRefsData & {
    result?: SyncedRefsJobExecResult
}

export type JobExecResultDone = {
    state: 'done'
    when: Date
}

export type JobExecResultFailed = {
    state: 'failed'
    when: Date
    error: string
}

export type JobExecResultException = {
    state: 'exception'
    when: Date
    error: string
    message?: string
    stack?: string
}

/*****************/
/*** REPO JOBS ***/
/*****************/

export type RepoJobId = JobIdFormat<`JOB_repos_${string}`>

export type RepoJobSpec = {
    jobId: RepoJobId
    label: string
}

export type RepoJobExecUpdate = {
    jobId: RepoJobId
    jobExecId: string
    status: RepoJobExecResult
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
export type RepoJobExecResult =
    | JobExecResultDone
    | JobExecResultFailed
    | JobExecResultException
    | RepoJobExecResultCommitReview
    | RepoJobExecResultCommitMerged

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

/***************************/
/*** SCHEDULED REFS JOBS ***/
/***************************/

export type ScheduledJobId = JobIdFormat<`JOB_scheduled_${string}`>

/************************/
/*** SYNCED REFS JOBS ***/
/************************/

export type SyncedRefsJobId = JobIdFormat<`JOB_syncedRefs_${string}`>

// result of job on a repo's synced refs
export type SyncedRefsJobExecResult =
    | JobExecResultDone
    | JobExecResultFailed
    | JobExecResultException

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
