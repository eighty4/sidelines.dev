import {
    joinRepoName,
    type RepoNameWithOwner,
    type RepositoryId,
    type RepoWatches,
} from '@sidelines/model'
import type { ReadingWatchRecord } from '../records.ts'
import { DB_INDEX_READ_WATCHES_REPO, DB_STORE_READ_WATCHES } from '../stores.ts'
import { idbDeleteRecord, idbPutRecord } from '../tx.ts'

export function createWatch(
    db: IDBDatabase,
    repo: RepositoryId,
    path: string,
): Promise<void> {
    return idbPutRecord<ReadingWatchRecord>(db, DB_STORE_READ_WATCHES, {
        nameWithOwner: joinRepoName(repo),
        repo,
        path,
    })
}

export function deleteWatch(
    db: IDBDatabase,
    repo: RepositoryId,
    path: string,
): Promise<void> {
    return idbDeleteRecord(db, DB_STORE_READ_WATCHES, [
        joinRepoName(repo),
        path,
    ])
}

export function getReposWithWatches(
    db: IDBDatabase,
): Promise<Set<RepoNameWithOwner>> {
    return new Promise((res, rej) => {
        const request: IDBRequest<IDBCursorWithValue | null> = db
            .transaction(DB_STORE_READ_WATCHES, 'readonly')
            .objectStore(DB_STORE_READ_WATCHES)
            .openCursor()

        const repos: Set<RepoNameWithOwner> = new Set()
        request.onsuccess = () => {
            const cursor = request.result
            if (cursor) {
                const record = cursor.value as ReadingWatchRecord
                repos.add(record.nameWithOwner)
                cursor.continue()
            } else {
                res(repos)
            }
        }
        request.onerror = rej
    })
}

export function getAllWatches(db: IDBDatabase): Promise<Array<RepoWatches>> {
    return new Promise((res, rej) => {
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
                const record = cursor.value as ReadingWatchRecord
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

export function getWatchesForRepo(
    db: IDBDatabase,
    repo: RepositoryId,
): Promise<Array<string>> {
    return new Promise((res, rej) => {
        const repoKey = joinRepoName(repo)
        const request: IDBRequest<IDBCursorWithValue | null> = db
            .transaction(DB_STORE_READ_WATCHES, 'readonly')
            .objectStore(DB_STORE_READ_WATCHES)
            .index(DB_INDEX_READ_WATCHES_REPO)
            .openCursor(IDBKeyRange.only(repoKey))

        const paths: Array<string> = []
        request.onsuccess = () => {
            const cursor = request.result
            if (cursor) {
                const record = cursor.value as ReadingWatchRecord
                paths.push(record.path)
                cursor.continue()
            } else {
                res(paths)
            }
        }
        request.onerror = rej
    })
}
