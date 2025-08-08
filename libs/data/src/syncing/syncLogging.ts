import { connectToDb, DB_STORE_SYNCING } from '../database.ts'

export type SyncKind = 'repos'

export type SyncCategory = 'all'

type SyncRecord = {
    kind: SyncKind
    category: SyncCategory
    when: Date
}

export async function getTimeSinceLastSync(
    kind: SyncKind = 'repos',
    category = 'all',
): Promise<number | null> {
    return new Promise(async (res, rej) => {
        const db = await connectToDb()
        const request: IDBRequest<SyncRecord | undefined> = db
            .transaction(DB_STORE_SYNCING, 'readonly')
            .objectStore(DB_STORE_SYNCING)
            .get([kind, category])
        request.onsuccess = () =>
            res(
                request.result
                    ? Date.now() - request.result.when.getTime()
                    : null,
            )
        request.onerror = rej
    })
}

export async function updateSyncing(
    kind: SyncKind = 'repos',
    category = 'all',
): Promise<void> {
    return new Promise(async (res, rej) => {
        const db = await connectToDb()
        const request = db
            .transaction(DB_STORE_SYNCING, 'readwrite')
            .objectStore(DB_STORE_SYNCING)
            .put({ kind, category, when: new Date() })
        request.onsuccess = () => res()
        request.onerror = rej
    })
}
