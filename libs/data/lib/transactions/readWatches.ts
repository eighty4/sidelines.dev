import type {
    RepoNameWithOwner,
    RepositoryId,
    RepoWatches,
} from '@sidelines/model'
import {
    connectToDb,
    DB_INDEX_READ_WATCHES_REPO,
    DB_STORE_READ_WATCHES,
    idbDeleteRecord,
    idbPutRecord,
} from '../database.ts'

// DB_STORE_READ_WATCHES
type WatchRecord = {
    nameWithOwner: RepoNameWithOwner
    path: string
    repo: RepositoryId
}

export async function createWatch(
    repo: RepositoryId,
    path: string,
): Promise<void> {
    await idbPutRecord<WatchRecord>(DB_STORE_READ_WATCHES, {
        nameWithOwner: `${repo.owner}/${repo.name}`,
        repo,
        path,
    })
}

export async function deleteWatch(
    repo: RepositoryId,
    path: string,
): Promise<void> {
    await idbDeleteRecord(DB_STORE_READ_WATCHES, [
        `${repo.owner}/${repo.name}`,
        path,
    ])
}

// todo index to only get unique nameWithOwner
export async function getReposWithWatches(): Promise<Array<RepositoryId>> {
    return new Promise(async (res, rej) => {
        const db = await connectToDb()
        const request: IDBRequest<IDBCursorWithValue | null> = db
            .transaction(DB_STORE_READ_WATCHES, 'readonly')
            .objectStore(DB_STORE_READ_WATCHES)
            .openCursor()

        const repos: Record<string, RepositoryId> = {}
        request.onsuccess = () => {
            const cursor = request.result
            if (cursor) {
                const record = cursor.value as WatchRecord
                repos[record.nameWithOwner] = record.repo
                cursor.continue()
            } else {
                res(Object.values(repos))
            }
        }
        request.onerror = rej
    })
}

export async function getAllWatches(): Promise<Array<RepoWatches>> {
    return new Promise(async (res, rej) => {
        const db = await connectToDb()
        const request: IDBRequest<IDBCursorWithValue | null> = db
            .transaction(DB_STORE_READ_WATCHES, 'readonly')
            .objectStore(DB_STORE_READ_WATCHES)
            .openCursor()

        const results: Record<
            string,
            { repo: RepositoryId; paths: Array<string> }
        > = {}
        request.onsuccess = () => {
            const cursor = request.result
            if (cursor) {
                const record = cursor.value as WatchRecord
                if (!results[record.nameWithOwner]) {
                    results[record.nameWithOwner] = {
                        repo: record.repo,
                        paths: [],
                    }
                }
                results[record.nameWithOwner].paths.push(record.path)
                cursor.continue()
            } else {
                for (const { paths } of Object.values(results)) {
                    paths.sort()
                }
                res(
                    Object.keys(results)
                        .sort()
                        .map(nameWithOwner => results[nameWithOwner]),
                )
            }
        }
        request.onerror = rej
    })
}

export async function getWatchesForRepo(
    repo: RepositoryId,
): Promise<Array<string>> {
    return new Promise(async (res, rej) => {
        const repoKey = `${repo.owner}/${repo.name}`
        const db = await connectToDb()
        const request: IDBRequest<IDBCursorWithValue | null> = db
            .transaction(DB_STORE_READ_WATCHES, 'readonly')
            .objectStore(DB_STORE_READ_WATCHES)
            .index(DB_INDEX_READ_WATCHES_REPO)
            .openCursor(IDBKeyRange.only(repoKey))

        const paths: Array<string> = []
        request.onsuccess = () => {
            const cursor = request.result
            if (cursor) {
                const record = cursor.value as WatchRecord
                paths.push(record.path)
                cursor.continue()
            } else {
                res(paths)
            }
        }
        request.onerror = rej
    })
}
