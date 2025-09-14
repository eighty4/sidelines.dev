import type { RepositoryId } from '@sidelines/model'
import {
    connectToDb,
    DB_STORE_REPO_HEADS,
    DB_STORE_SYNC_LOG,
    DB_STORE_SYNC_TASKS,
} from '../database.ts'

type SyncRecord = {
    when: Date
}

type RepoHeadRecord = {
    nameWithOwner: string
    sha: string
}

export type SyncTask = 'packages' | 'watches'

type SyncTasksRecord = {
    when: Date
    nameWithOwner: string
    tasks: Record<SyncTask, boolean>
}

export type RepoUpdate = {
    repo: RepositoryId
    from?: string
    to: string
}

export async function getTimeSinceLastSync(): Promise<number | null> {
    return new Promise(async (res, rej) => {
        const db = await connectToDb()
        const request: IDBRequest<IDBCursor | null> = db
            .transaction(DB_STORE_SYNC_LOG, 'readonly')
            .objectStore(DB_STORE_SYNC_LOG)
            .openKeyCursor(null, 'prev')
        request.onsuccess = () =>
            res(
                request?.result?.key
                    ? (request.result.key as SyncRecord['when']).getTime()
                    : null,
            )
        request.onerror = rej
    })
}

export type HeadRef = {
    repo: RepositoryId
    sha: string
}

export function syncRefs(headRefs: Array<HeadRef>): Promise<Array<RepoUpdate>> {
    const reposToRefs: Record<string, HeadRef> = {}
    for (const headRef of headRefs) {
        const { owner, name } = headRef.repo
        reposToRefs[`${owner}/${name}`]
    }
    return new Promise(async (res, rej) => {
        const db = await connectToDb()
        const tx = db.transaction(
            [DB_STORE_REPO_HEADS, DB_STORE_SYNC_LOG, DB_STORE_SYNC_TASKS],
            'readwrite',
        )
        const repoHeadsStore = tx.objectStore(DB_STORE_REPO_HEADS)
        const syncTasksStore = tx.objectStore(DB_STORE_SYNC_TASKS)
        const syncLogStore = tx.objectStore(DB_STORE_SYNC_LOG)

        const updates: Array<RepoUpdate> = []
        tx.oncomplete = () => res(updates)
        tx.onerror = () => rej()

        const repoHeadsReq: IDBRequest<IDBCursorWithValue | null> =
            repoHeadsStore.openCursor()
        repoHeadsReq.onsuccess = () => {
            const cursor: IDBCursorWithValue | null = repoHeadsReq.result
            if (cursor) {
                const record = cursor.value as RepoHeadRecord
                if (reposToRefs[record.nameWithOwner]) {
                    const { repo, sha } = reposToRefs[record.nameWithOwner]
                    if (sha === record.sha) {
                        delete reposToRefs[record.nameWithOwner]
                    } else {
                        updates.push({ repo, from: record.sha, to: sha })
                        const updatedRecord: RepoHeadRecord = {
                            ...record,
                            sha,
                        }
                        cursor.update(updatedRecord)
                    }
                }
                cursor.continue()
            } else {
                for (const [nameWithOwner, { sha }] of Object.entries(
                    reposToRefs,
                )) {
                    const record: RepoHeadRecord = {
                        nameWithOwner,
                        sha,
                    }
                    repoHeadsStore.add(record)
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
