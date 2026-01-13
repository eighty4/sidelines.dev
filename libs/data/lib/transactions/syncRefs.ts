import type { RepoDefaultBranch, RepositoryId } from '@sidelines/model'
import {
    connectToDb,
    DB_STORE_REPO_HEADS,
    DB_STORE_REPO_SYNCING,
    DB_STORE_SYNC_LOG,
} from '../database.ts'

// DB_STORE_REPO_HEADS
type RepoHeadRecord = {
    nameWithOwner: string
    defaultBranch: string
    sha: string
}

// DB_STORE_REPO_SYNCING
type SyncTasksRecord = {
    when: Date
    nameWithOwner: string
    tasks: Record<SyncTask, boolean>
}

// DB_STORE_SYNC_LOG
type SyncRecord = {
    when: Date
}

export type SyncTask = 'packages' | 'watches'

export async function getTimeSinceLastSync(): Promise<number | null> {
    return new Promise(async (res, rej) => {
        const db = await connectToDb()
        const request: IDBRequest<IDBCursorWithValue | null> = db
            .transaction(DB_STORE_SYNC_LOG, 'readonly')
            .objectStore(DB_STORE_SYNC_LOG)
            .openCursor(null, 'prev')
        request.onsuccess = () => {
            if (request.result?.value) {
                res((request.result.value as SyncRecord).when.getTime())
            } else {
                res(null)
            }
        }
        request.onerror = rej
    })
}

export type RepoUpdate = {
    repo: RepositoryId
    from?: string
    to: string
}

export function syncRefs(
    refs: Array<RepoDefaultBranch>,
): Promise<Array<RepoUpdate>> {
    const reposToRefs: Record<string, RepoDefaultBranch> = {}
    for (const ref of refs) {
        reposToRefs[`${ref.repo.owner}/${ref.repo.name}`] = ref
    }
    return new Promise(async (res, rej) => {
        const db = await connectToDb()
        const tx = db.transaction(
            [DB_STORE_REPO_HEADS, DB_STORE_REPO_SYNCING, DB_STORE_SYNC_LOG],
            'readwrite',
        )
        const repoHeadsStore = tx.objectStore(DB_STORE_REPO_HEADS)
        const syncTasksStore = tx.objectStore(DB_STORE_REPO_SYNCING)
        const syncLogStore = tx.objectStore(DB_STORE_SYNC_LOG)

        const updates: Array<RepoUpdate> = []
        tx.oncomplete = () => {
            console.log('syncRefs tx complete', updates)
            res(updates)
        }
        tx.onerror = e => {
            console.log('syncRefs tx error', e)
            rej()
        }

        const repoHeadsReq: IDBRequest<IDBCursorWithValue | null> =
            repoHeadsStore.openCursor()

        repoHeadsReq.onsuccess = () => {
            const cursor: IDBCursorWithValue | null = repoHeadsReq.result
            if (cursor) {
                const record = cursor.value as RepoHeadRecord
                if (reposToRefs[record.nameWithOwner]) {
                    const { repo, defaultBranch } =
                        reposToRefs[record.nameWithOwner]
                    if (defaultBranch.headOid === record.sha) {
                        delete reposToRefs[record.nameWithOwner]
                    } else {
                        updates.push({
                            repo,
                            from: record.sha,
                            to: defaultBranch.headOid,
                        })
                        const updatedRecord: RepoHeadRecord = {
                            ...record,
                            defaultBranch: defaultBranch.name,
                            sha: defaultBranch.headOid,
                        }
                        cursor.update(updatedRecord)
                    }
                }
                cursor.continue()
            } else {
                for (const [
                    nameWithOwner,
                    { repo, defaultBranch },
                ] of Object.entries(reposToRefs)) {
                    const record: RepoHeadRecord = {
                        nameWithOwner,
                        defaultBranch: defaultBranch.name,
                        sha: defaultBranch.headOid,
                    }
                    repoHeadsStore.add(record)
                    updates.push({ repo, to: defaultBranch.headOid })
                }
                const when = new Date()
                syncLogStore.put({ when })
                for (const update of updates) {
                    const syncTask: SyncTasksRecord = {
                        when,
                        nameWithOwner: `${update.repo.owner}/${update.repo.name}`,
                        tasks: {
                            packages: false,
                            watches: false,
                        },
                    }
                    syncTasksStore.add(syncTask)
                }
            }
        }
    })
}
