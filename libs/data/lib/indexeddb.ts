import {
    DB_INDEX_READ_WATCHES_REPO,
    DB_INDEX_READ_WATCHES_REPO_KEY,
    DB_INDEX_REPO_NAV_WHEN,
    DB_INDEX_REPO_NAV_WHEN_KEY,
    DB_STORE_COMMIT_REVIEW,
    DB_STORE_COMMIT_REVIEW_KEY,
    DB_STORE_JOB_LOG,
    DB_STORE_JOB_LOG_KEY,
    DB_STORE_JOB_SCHEDULING,
    DB_STORE_JOB_SCHEDULING_KEY,
    DB_STORE_READ_WATCHES,
    DB_STORE_READ_WATCHES_KEY,
    DB_STORE_REPO_CONTEXT,
    DB_STORE_REPO_CONTEXT_KEY,
    DB_STORE_REPO_HEADS,
    DB_STORE_REPO_HEADS_KEY,
    DB_STORE_REPO_NAV,
    DB_STORE_REPO_NAV_KEY,
    DB_STORE_REPO_PACKAGES,
    DB_STORE_REPO_PACKAGES_KEY,
} from './database.ts'

const DB_NAME = 'sidelines-dev'
const DB_VERSION = 1

export async function connectToDb(): Promise<IDBDatabase> {
    return new Promise((res, rej) => {
        const opening = indexedDB.open(DB_NAME, DB_VERSION)
        opening.onupgradeneeded = (e: IDBVersionChangeEvent) => {
            console.log(
                '@sidelines/data IndexedDB upgrading from',
                e.oldVersion,
                'to',
                DB_VERSION,
            )
            try {
                upgradeDatabaseSchema((e.target as any).result, e.oldVersion)
            } catch (e: any) {
                console.error(
                    '@sidelines/data IndexedDB upgrade error from',
                    e.oldVersion,
                    'to',
                    DB_VERSION,
                    e.message,
                )
                throw e
            }
        }
        opening.onerror = () =>
            rej(
                new Error('@sidelines/data IndexedDB connectToDb error', {
                    cause: opening.error,
                }),
            )
        opening.onsuccess = () => {
            console.log('@sidelines/data IndexedDB connected')
            res(opening.result)
        }
    })
}

function upgradeDatabaseSchema(db: IDBDatabase, oldVersion: number) {
    while (oldVersion < DB_VERSION) {
        if (oldVersion === 0) {
            db.createObjectStore(DB_STORE_REPO_CONTEXT, {
                keyPath: DB_STORE_REPO_CONTEXT_KEY,
            })
            db.createObjectStore(DB_STORE_JOB_LOG, {
                keyPath: DB_STORE_JOB_LOG_KEY,
            })
            db.createObjectStore(DB_STORE_JOB_SCHEDULING, {
                keyPath: DB_STORE_JOB_SCHEDULING_KEY,
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
