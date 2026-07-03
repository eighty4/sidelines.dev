import { joinRepoName, type RepositoryId } from '@sidelines/model'
import { DB_INDEX_REPO_NAV_WHEN, DB_STORE_REPO_NAV } from '../database.ts'
import type { RepoNavRecord } from '../records.ts'
import { idbPutRecord } from '../tx.ts'

const LIMIT_NAV = 5

export type NavQueryOpts = {
    limit?: number
}

export function readRecentNav(
    db: IDBDatabase,
    opts: NavQueryOpts,
): Promise<Array<RepositoryId>> {
    return new Promise((res, rej) => {
        const tx = db.transaction([DB_STORE_REPO_NAV], 'readonly')
        const req: IDBRequest<IDBCursorWithValue | null> = tx
            .objectStore(DB_STORE_REPO_NAV)
            .index(DB_INDEX_REPO_NAV_WHEN)
            .openCursor(null, 'prev')

        const limit = opts?.limit || LIMIT_NAV
        const repos: Array<RepositoryId> = []

        req.onsuccess = () => {
            const cursor: IDBCursorWithValue | null = req.result
            if (cursor) {
                const record = cursor.value as RepoNavRecord
                repos.push(record.repo)
                if (repos.length < limit) {
                    cursor.continue()
                }
            }
        }

        tx.oncomplete = () => res(repos)

        tx.onerror = e => {
            console.error('db error', e)
            rej(e)
        }
    })
}

export function writeNavVisit(
    db: IDBDatabase,
    repo: RepositoryId,
): Promise<void> {
    return idbPutRecord<RepoNavRecord>(db, DB_STORE_REPO_NAV, {
        nameWithOwner: joinRepoName(repo),
        repo,
        when: new Date(),
    })
}
