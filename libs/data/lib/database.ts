/*********************/
/*** COMMIT REVIEW ***/
/*********************/

export const DB_STORE_COMMIT_REVIEW = 'commit-review'
export const DB_STORE_COMMIT_REVIEW_KEY = ['reviewId']

/***************/
/*** JOB LOG ***/
/***************/

export const DB_STORE_JOB_LOG = 'job-log'
export const DB_STORE_JOB_LOG_KEY = 'jobExecId'

export const DB_STORE_JOB_RESULT = 'job-result'
export const DB_STORE_JOB_RESULT_KEY = ['jobExecId', 'whenDone']

export const DB_STORE_JOB_SCHEDULING = 'job-scheduling'
export const DB_STORE_JOB_SCHEDULING_KEY = 'jobId'

/***********************/
/*** READING WATCHES ***/
/***********************/

// export const DB_STORE_READ_COMMITS = 'read-commits'
// const DB_STORE_READ_COMMITS_KEY = ['']

export const DB_STORE_READ_WATCHES = 'read-watches'
export const DB_STORE_READ_WATCHES_KEY = ['nameWithOwner', 'path']

export const DB_INDEX_READ_WATCHES_REPO = 'read-watches-by-repo'
export const DB_INDEX_READ_WATCHES_REPO_KEY = 'nameWithOwner'

/*************************/
/*** REPO USER CONTEXT ***/
/*************************/

export const DB_STORE_REPO_CONTEXT = 'repo-context'
export const DB_STORE_REPO_CONTEXT_KEY = 'nameWithOwner'

/************************/
/*** REPO NAV HISTORY ***/
/************************/

export const DB_STORE_REPO_NAV = 'repo-nav'
export const DB_STORE_REPO_NAV_KEY = 'nameWithOwner'

export const DB_INDEX_REPO_NAV_WHEN = 'repo-nav-visited'
export const DB_INDEX_REPO_NAV_WHEN_KEY = 'when'

/******************/
/*** REPO HEADS ***/
/******************/

export const DB_STORE_REPO_HEADS = 'repo-heads'
export const DB_STORE_REPO_HEADS_KEY = 'repo'

/*********************/
/*** REPO PACKAGES ***/
/*********************/

// cache for offline, cron synced
// keyed by repo, branch, sha

export const DB_STORE_REPO_PACKAGES = 'repo-pkgs'
export const DB_STORE_REPO_PACKAGES_KEY = [
    'nameWithOwner',
    'defaultBranch',
    'headOid',
]
