import type {
    RepositoryId,
    RepoJobExecStatus,
    RepoJobId,
} from '@sidelines/model'
import { connectToDb, DB_STORE_REPO_JOBS } from '../database.ts'

// DB_STORE_REPO_JOBS
type JobLogRecord = {
    jobId: RepoJobId
    jobExecId: string
    repos: Record<string, RepoJobExecStatus>
    whenInit: Date
    whenLastActivity?: Date
    whenDone?: Date
}

export async function createRepoJobRecord(
    jobId: RepoJobId,
    jobExecId: string,
): Promise<void> {
    const db = await connectToDb()
    await new Promise<void>((res, rej) => {
        const tx = db.transaction([DB_STORE_REPO_JOBS], 'readwrite')
        tx.objectStore(DB_STORE_REPO_JOBS).add({
            jobId,
            jobExecId,
            repos: {},
            whenInit: new Date(),
        } satisfies JobLogRecord)
        tx.oncomplete = () => res()
        tx.onerror = e => {
            console.error('db error', e)
            rej(e)
        }
    })
}

// returns array of `jobExecId` that match certain criteria for `whenDone` and `whenLastActivity`
export async function readRepoJobsUncompleted(): Promise<Array<string>> {
    const db = await connectToDb()
    return await new Promise((res, rej) => {
        const request: IDBRequest<IDBCursorWithValue | null> = db
            .transaction(DB_STORE_REPO_JOBS, 'readonly')
            .objectStore(DB_STORE_REPO_JOBS)
            .openCursor()
        const jobExecIds: Array<string> = []
        const lastActivityThreshold = createLastActivityThreshold()
        request.onsuccess = () => {
            const cursor = request.result
            if (cursor) {
                const record = cursor.value as JobLogRecord
                if (isRepoJobUncompleted(record, lastActivityThreshold)) {
                    jobExecIds.push(record.jobExecId)
                }
                cursor.continue()
            } else {
                res(jobExecIds)
            }
        }
        request.onerror = rej
    })
}

function createLastActivityThreshold(): Date {
    const date = new Date()
    date.setTime(date.getTime() - 10 * 60 * 1000)
    return date
}

function isRepoJobUncompleted(record: JobLogRecord, tenMinsAgo: Date): boolean {
    if (record.whenDone) {
        return false
    }
    return (
        (record.whenLastActivity ?? record.whenInit).getTime() <
        tenMinsAgo.getTime()
    )
}

// returns all of job's repos resolved with a completion state
// used when restarting a job to diff with all viewer repos
export async function readJobCompletedRepos(
    jobExecId: string,
): Promise<Array<RepositoryId>> {
    const db = await connectToDb()
    return await new Promise((res, rej) => {
        const tx = db.transaction(DB_STORE_REPO_JOBS, 'readonly')
        db
            .transaction(DB_STORE_REPO_JOBS, 'readonly')
            .objectStore(DB_STORE_REPO_JOBS)
            .get(jobExecId).onsuccess = e => {
            const completed: Array<RepositoryId> = []
            for (const nameWithOwner of Object.keys(
                (e.target as IDBRequest<JobLogRecord>).result.repos,
            )) {
                const separator = nameWithOwner.indexOf('/')
                const owner = nameWithOwner.substring(0, separator)
                const name = nameWithOwner.substring(separator + 1)
                completed.push({ owner, name })
            }
            res(completed)
        }
        tx.onerror = rej
    })
}

export async function markRepoJobStatus(
    jobExecId: string,
    repoId: RepositoryId,
    status: RepoJobExecStatus,
): Promise<void> {
    const db = await connectToDb()
    await new Promise<void>((res, rej) => {
        const tx = db.transaction([DB_STORE_REPO_JOBS], 'readwrite')
        const objectStore = tx.objectStore(DB_STORE_REPO_JOBS)
        tx.objectStore(DB_STORE_REPO_JOBS).get(jobExecId).onsuccess = e => {
            const record = (e.target as IDBRequest<JobLogRecord>).result
            record.repos[`${repoId.owner}/${repoId.name}`] = status
            record.whenLastActivity = new Date()
            objectStore.put(record)
        }
        tx.oncomplete = () => res()
        tx.onerror = rej
    })
}

export async function markJobDone(jobExecId: string): Promise<void> {
    const db = await connectToDb()
    await new Promise<void>((res, rej) => {
        const tx = db.transaction([DB_STORE_REPO_JOBS], 'readwrite')
        const objectStore = tx.objectStore(DB_STORE_REPO_JOBS)
        tx.objectStore(DB_STORE_REPO_JOBS).get(jobExecId).onsuccess = e => {
            const record = (e.target as IDBRequest<JobLogRecord>).result
            record.whenLastActivity = record.whenDone = new Date()
            objectStore.put(record)
        }
        tx.oncomplete = () => res()
        tx.onerror = rej
    })
}
