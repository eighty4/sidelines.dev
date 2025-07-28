const DB_NAME = 'sidelines-dev'
const DB_VERSION = 2

export const DB_STORE_NAV = 'repo-nav'
export const DB_INDEX_NAV = 'repo-nav-visited'
export const DB_STORE_FILES = 'repo-objects'
export const DB_STORE_FILES_KEY = ['owner', 'name', 'sha', 'dirpath']

function upgradeDatabaseSchema(db: IDBDatabase, oldVersion: number) {
    console.log('upgrading db from', oldVersion)
    while (oldVersion < DB_VERSION) {
        if (oldVersion === 0) {
            const projectNavStore = db.createObjectStore(DB_STORE_NAV, {
                keyPath: 'nameWithOwner',
            })
            projectNavStore.createIndex(DB_INDEX_NAV, 'when')
        } else if (oldVersion === 1) {
            db.createObjectStore(DB_STORE_FILES, {
                keyPath: DB_STORE_FILES_KEY,
            })
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
                Error('error requesting database', {
                    cause: (e.target as any).error,
                }),
            )
        opening.onsuccess = e => res((e.target as any).result)
    })
}
