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

export function idbGetRecord<T>(
    db: IDBDatabase,
    objectStore: string,
    key: any,
): Promise<T | null> {
    return new Promise((res, rej) => {
        const tx = db.transaction(objectStore, 'readonly')
        const req: IDBRequest<T | undefined> = tx
            .objectStore(objectStore)
            .get(key)

        req.onsuccess = () => res(req.result || null)

        req.onerror = e => {
            console.error(objectStore, 'getRecord error', e)
            rej(e)
        }
    })
}

export function idbDeleteRecord(
    db: IDBDatabase,
    objectStore: string,
    key: any,
): Promise<void> {
    return new Promise((res, rej) => {
        const req: IDBRequest = db
            .transaction(objectStore, 'readwrite')
            .objectStore(objectStore)
            .delete(key)

        req.onsuccess = () => res()

        req.onerror = e => {
            console.error(objectStore, 'deleteRecord error', e)
            rej(e)
        }
    })
}

export function idbAddRecord<T>(
    db: IDBDatabase,
    objectStore: string,
    record: T,
): Promise<void> {
    return new Promise((res, rej) => {
        const tx = db.transaction(objectStore, 'readwrite')
        tx.objectStore(objectStore).add(record)
        tx.oncomplete = () => res()
        tx.onerror = e => {
            console.error(objectStore, 'addRecord error', e)
            rej(e)
        }
    })
}

export function idbPutRecord<T>(
    db: IDBDatabase,
    objectStore: string,
    record: T,
): Promise<void> {
    return new Promise((res, rej) => {
        const tx = db.transaction(objectStore, 'readwrite')
        const req: IDBRequest = tx.objectStore(objectStore).put(record)

        req.onsuccess = () => res()

        req.onerror = e => {
            console.error(objectStore, 'putRecord error', e)
            rej(e)
        }
    })
}

export function idbGetComputePutRecord<T>(
    db: IDBDatabase,
    objectStore: string,
    key: any,
    compute: (record: T | null) => T,
): Promise<void> {
    return new Promise((res, rej) => {
        const tx = db.transaction(objectStore, 'readwrite')
        idbGetComputePutRecordWithTx(tx, objectStore, key, compute)
        tx.oncomplete = () => res()
        tx.onerror = e => {
            console.error(objectStore, 'idbGetComputePutRecord error', e)
            rej(e)
        }
    })
}

export function idbGetComputePutRecordWithTx<T>(
    tx: IDBTransaction,
    objectStore: string,
    key: any,
    compute: (record: T | null) => T,
): void {
    const os = tx.objectStore(objectStore)
    const req: IDBRequest<T | undefined> = os.get(key)
    req.onsuccess = () => os.put(compute(req.result || null))
}
