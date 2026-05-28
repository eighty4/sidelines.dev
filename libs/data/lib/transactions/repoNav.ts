import type { RepoNameWithOwner, RepositoryId } from '@sidelines/model'
import {
    connectToDb,
    DB_INDEX_REPO_NAV_WHEN,
    DB_STORE_REPO_NAV,
    idbPutRecord,
} from '../database.ts'

const LIMIT_NAV = 5

// DB_STORE_REPO_NAV
type NavRecord = {
    nameWithOwner: RepoNameWithOwner
    repo: RepositoryId
    when: Date
}

type NavQueryOpts = {
    limit?: number
}

export async function readRecentNav(
    opts: NavQueryOpts,
): Promise<Array<RepositoryId>> {
    const db = await connectToDb()
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
                const record = cursor.value as NavRecord
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

export async function writeNavVisit(repo: RepositoryId) {
    await idbPutRecord<NavRecord>(DB_STORE_REPO_NAV, {
        nameWithOwner: `${repo.owner}/${repo.name}`,
        repo,
        when: new Date(),
    })
}
