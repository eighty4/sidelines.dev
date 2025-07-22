import { connectToDb, DB_INDEX_NAV, DB_STORE_NAV } from './open.ts'
import type { RepositoryId } from '../model.ts'

const LIMIT_NAV = 5

type NavRecord = {
    nameWithOwner: string
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
        const limit = opts?.limit || LIMIT_NAV
        const tx = db.transaction([DB_STORE_NAV], 'readonly')
        const repos: Array<RepositoryId> = []

        tx
            .objectStore(DB_STORE_NAV)
            .index(DB_INDEX_NAV)
            .openCursor(null, 'prev').onsuccess = e => {
            if (repos.length < limit) {
                const cursor = (e.target as any).result
                if (cursor) {
                    const record = cursor.value as NavRecord
                    repos.push(record.repo)
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
    const db = await connectToDb()
    await new Promise<void>((res, rej) => {
        const tx = db.transaction([DB_STORE_NAV], 'readwrite')
        const record: NavRecord = {
            nameWithOwner: `${repo.owner}/${repo.name}`,
            repo,
            when: new Date(),
        }
        tx.objectStore(DB_STORE_NAV).put(record)
        tx.commit()

        tx.oncomplete = () => res()

        tx.onerror = e => {
            console.error('db error', e)
            rej(e)
        }
    })
}
