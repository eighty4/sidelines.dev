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

/************************/
/*** SYNCED REFS JOBS ***/
/************************/

// result of job on a repo's synced refs
export type SyncedRefsJobExecResult =
    | JobExecResultDone
    | JobExecResultFailed
    | JobExecResultException
