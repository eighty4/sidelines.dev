const DB_NAME = 'sidelines-dev6'
const DB_VERSION = 1

export const DB_STORE_READ_COMMITS = 'read-commits'
// const DB_STORE_READ_COMMITS_KEY = ['']

export const DB_STORE_READ_WATCHES = 'read-watches'
const DB_STORE_READ_WATCHES_KEY = ['nameWithOwner', 'path']

export const DB_INDEX_READ_WATCHES_REPO = 'read-watches-by-repo'
const DB_INDEX_READ_WATCHES_REPO_KEY = 'nameWithOwner'

export const DB_STORE_REPO_NAV = 'repo-nav'
const DB_STORE_REPO_NAV_KEY = 'nameWithOwner'

export const DB_INDEX_REPO_NAV_WHEN = 'repo-nav-visited'
const DB_INDEX_REPO_NAV_WHEN_KEY = 'when'

export const DB_STORE_REPO_FILES = 'repo-objects'
const DB_STORE_REPO_FILES_KEY = ['owner', 'name', 'sha', 'dirpath']

export const DB_STORE_REPO_HEADS = 'repo-heads'
const DB_STORE_REPO_HEADS_KEY = 'nameWithOwner'

export const DB_STORE_REPO_PACKAGES = 'repo-pkgs'
const DB_STORE_REPO_PACKAGES_KEY = ['nameWithOwner', 'commitHash']

export const DB_STORE_REPO_SYNCING = 'repo-syncing'
const DB_STORE_REPO_SYNCING_KEY = ['when', 'nameWithOwner', 'task']

export const DB_STORE_SYNC_LOG = 'sync-log'
const DB_STORE_SYNC_LOG_KEY = ['when']

export const DB_OBJECT_STORES = [
    DB_STORE_READ_COMMITS,
    DB_STORE_READ_WATCHES,
    DB_STORE_REPO_NAV,
    DB_STORE_REPO_FILES,
    DB_STORE_REPO_HEADS,
    DB_STORE_REPO_PACKAGES,
    DB_STORE_REPO_SYNCING,
    DB_STORE_SYNC_LOG,
]

function upgradeDatabaseSchema(db: IDBDatabase, oldVersion: number) {
    console.log('upgrading db from', oldVersion)
    while (oldVersion < DB_VERSION) {
        if (oldVersion === 0) {
            db.createObjectStore(DB_STORE_REPO_NAV, {
                keyPath: DB_STORE_REPO_NAV_KEY,
            }).createIndex(DB_INDEX_REPO_NAV_WHEN, DB_INDEX_REPO_NAV_WHEN_KEY)
            db.createObjectStore(DB_STORE_REPO_FILES, {
                keyPath: DB_STORE_REPO_FILES_KEY,
            })
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
            } catch (e) {
                console.error(e)
                throw e
            }
        }
        opening.onerror = e =>
            rej(
                new Error('error requesting database', {
                    cause: (e.target as any).error,
                }),
            )
        opening.onsuccess = e => res((e.target as any).result)
    })
}
