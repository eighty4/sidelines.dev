const DB_NAME = 'sidelines-dev2'
const DB_VERSION = 1

export const DB_STORE_REPO_NAV = 'repo-nav'
const DB_STORE_REPO_NAV_KEY = 'nameWithOwner'

export const DB_INDEX_REPO_NAV_WHEN = 'repo-nav-visited'
const DB_INDEX_REPO_NAV_WHEN_KEY = 'when'

export const DB_STORE_REPO_FILES = 'repo-objects'
const DB_STORE_REPO_FILES_KEY = ['owner', 'name', 'sha', 'dirpath']

export const DB_STORE_REPO_PACKAGES = 'repo-pkgs'
const DB_STORE_REPO_PACKAGES_KEY = ['nameWithOwner', 'commitHash']

export const DB_STORE_SYNCING = 'sync-log'
const DB_STORE_SYNCING_KEY = ['kind', 'category']

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
            db.createObjectStore(DB_STORE_SYNCING, {
                keyPath: DB_STORE_SYNCING_KEY,
            })
        } else if (oldVersion === 1) {
        } else if (oldVersion === 2) {
        }
        oldVersion++
    }
}

export async function connectToDb(): Promise<IDBDatabase> {
    return new Promise((res, rej) => {
        const opening = indexedDB.open(DB_NAME, DB_VERSION)
        opening.onupgradeneeded = (e: IDBVersionChangeEvent) =>
            upgradeDatabaseSchema((e.target as any).result, e.oldVersion)
        opening.onerror = e =>
            rej(
                new Error('error requesting database', {
                    cause: (e.target as any).error,
                }),
            )
        opening.onsuccess = e => res((e.target as any).result)
    })
}
