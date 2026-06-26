const DB_NAME = 'sidelines-dev'
const DB_VERSION = 1

/***************/
/*** JOB LOG ***/
/***************/

export const DB_STORE_JOB_LOG = 'job-log'
const DB_STORE_JOB_LOG_KEY = 'jobExecId'

export const DB_STORE_COMMIT_REVIEW = 'commit-review'
const DB_STORE_COMMIT_REVIEW_KEY = ['reviewId']

/***************/
/*** WATCHES ***/
/***************/

// export const DB_STORE_READ_COMMITS = 'read-commits'
// const DB_STORE_READ_COMMITS_KEY = ['']

export const DB_STORE_READ_WATCHES = 'read-watches'
const DB_STORE_READ_WATCHES_KEY = ['nameWithOwner', 'path']

export const DB_INDEX_READ_WATCHES_REPO = 'read-watches-by-repo'
const DB_INDEX_READ_WATCHES_REPO_KEY = 'nameWithOwner'

/*************************/
/*** REPO USER CONTEXT ***/
/*************************/

export const DB_STORE_REPO_CONTEXT = 'repo-context'
const DB_STORE_REPO_CONTEXT_KEY = 'nameWithOwner'

/************************/
/*** REPO NAV HISTORY ***/
/************************/

export const DB_STORE_REPO_NAV = 'repo-nav'
const DB_STORE_REPO_NAV_KEY = 'nameWithOwner'

export const DB_INDEX_REPO_NAV_WHEN = 'repo-nav-visited'
const DB_INDEX_REPO_NAV_WHEN_KEY = 'when'

/******************/
/*** REPO HEADS ***/
/******************/

export const DB_STORE_REPO_HEADS = 'repo-heads'
const DB_STORE_REPO_HEADS_KEY = 'nameWithOwner'

/*********************/
/*** REPO PACKAGES ***/
/*********************/

// cache for offline, cron synced
// keyed by repo, branch, sha

export const DB_STORE_REPO_PACKAGES = 'repo-pkgs'
const DB_STORE_REPO_PACKAGES_KEY = ['nameWithOwner', 'defaultBranch', 'headOid']

/********************/
/*** REPO SYNCING ***/
/********************/

export const DB_STORE_REPO_SYNCING = 'repo-syncing'
const DB_STORE_REPO_SYNCING_KEY = ['when', 'nameWithOwner', 'task']

export const DB_STORE_SYNC_LOG = 'sync-log'
const DB_STORE_SYNC_LOG_KEY = ['when']

function upgradeDatabaseSchema(db: IDBDatabase, oldVersion: number) {
    console.log('upgrading db from', oldVersion)
    while (oldVersion < DB_VERSION) {
        if (oldVersion === 0) {
            db.createObjectStore(DB_STORE_REPO_CONTEXT, {
                keyPath: DB_STORE_REPO_CONTEXT_KEY,
            })
            db.createObjectStore(DB_STORE_JOB_LOG, {
                keyPath: DB_STORE_JOB_LOG_KEY,
            })
            db.createObjectStore(DB_STORE_COMMIT_REVIEW, {
                keyPath: DB_STORE_COMMIT_REVIEW_KEY,
            })
            db.createObjectStore(DB_STORE_REPO_NAV, {
                keyPath: DB_STORE_REPO_NAV_KEY,
            }).createIndex(DB_INDEX_REPO_NAV_WHEN, DB_INDEX_REPO_NAV_WHEN_KEY)
            db.createObjectStore(DB_STORE_REPO_PACKAGES, {
                keyPath: DB_STORE_REPO_PACKAGES_KEY,
            })
            db.createObjectStore(DB_STORE_SYNC_LOG, {
                keyPath: DB_STORE_SYNC_LOG_KEY,
            })
            db.createObjectStore(DB_STORE_REPO_SYNCING, {
                keyPath: DB_STORE_REPO_SYNCING_KEY,
            })
            db.createObjectStore(DB_STORE_REPO_HEADS, {
                keyPath: DB_STORE_REPO_HEADS_KEY,
            })
            db.createObjectStore(DB_STORE_READ_WATCHES, {
                keyPath: DB_STORE_READ_WATCHES_KEY,
            }).createIndex(
                DB_INDEX_READ_WATCHES_REPO,
                DB_INDEX_READ_WATCHES_REPO_KEY,
            )
            // db.createObjectStore(DB_STORE_READ_COMMITS, {
            //     keyPath: DB_STORE_READ_COMMITS_KEY,
            // })
        } else if (oldVersion === 1) {
        } else if (oldVersion === 2) {
        }
        oldVersion++
    }
}

export async function connectToDb(): Promise<IDBDatabase> {
    return new Promise((res, rej) => {
        const opening = indexedDB.open(DB_NAME, DB_VERSION)
        opening.onupgradeneeded = (e: IDBVersionChangeEvent) => {
            try {
                upgradeDatabaseSchema((e.target as any).result, e.oldVersion)
            } catch (e: any) {
                console.error(
                    '@sidelines/data database.ts connectToDb onupgradeneeded',
                    e.message,
                )
                throw e
            }
        }
        opening.onerror = () =>
            rej(
                new Error('error requesting database', {
                    cause: opening.error,
                }),
            )
        opening.onsuccess = () => res(opening.result)
    })
}

export async function idbGetRecord<T>(
    objectStore: string,
    key: any,
): Promise<T | null> {
    const db = await connectToDb()
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

export async function idbDeleteRecord(
    objectStore: string,
    key: any,
): Promise<void> {
    return new Promise(async (res, rej) => {
        const db = await connectToDb()
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

export async function idbAddRecord<T>(
    objectStore: string,
    record: T,
): Promise<void> {
    const db = await connectToDb()
    return new Promise((res, rej) => {
        const tx = db.transaction(objectStore, 'readwrite')
        const req: IDBRequest = tx.objectStore(objectStore).add(record)

        req.onsuccess = () => res()

        req.onerror = e => {
            console.error(objectStore, 'addRecord error', e)
            rej(e)
        }
    })
}

export async function idbPutRecord<T>(
    objectStore: string,
    record: T,
): Promise<void> {
    const db = await connectToDb()
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
