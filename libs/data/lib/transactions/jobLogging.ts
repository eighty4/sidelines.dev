import { type RepositoryId, RepositorySet } from '@sidelines/model'
import {
    connectToDb,
    DB_STORE_REPO_JOBS,
    DB_STORE_REPO_JOB_TASKS,
} from '../database.ts'

type JobLogRecord = {
    jobExecId: string
    whenStarted: Date
    whenLastActivity?: Date
    whenCompleted?: Date
}

type JobRepoDoneRecord = {
    jobExecId: string
    // `owner/name` format
    repo: string
    whenDone: Date
}

export async function createRepoJobRecord(jobExecId: string) {
    const db = await connectToDb()
    await new Promise<void>((res, rej) => {
        const tx = db.transaction([DB_STORE_REPO_JOBS], 'readwrite')
        const record: JobLogRecord = {
            jobExecId,
            whenStarted: new Date(),
        }
        tx.objectStore(DB_STORE_REPO_JOBS).add(record)
        tx.oncomplete = () => res()
        tx.onerror = e => {
            console.error('db error', e)
            rej(e)
        }
    })
}

// returns array of `jobExecId` that match certain criteria for `whenCompleted` and `whenLastActivity`
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
    if (record.whenCompleted) {
        return false
    }
    return (
        (record.whenLastActivity ?? record.whenStarted).getTime() <
        tenMinsAgo.getTime()
    )
}

export async function readRepoJobTasksCompleted(
    jobExecId: string,
): Promise<RepositorySet> {
    const db = await connectToDb()
    return await new Promise((res, rej) => {
        const request: IDBRequest<IDBCursorWithValue | null> = db
            .transaction(DB_STORE_REPO_JOB_TASKS, 'readonly')
            .objectStore(DB_STORE_REPO_JOB_TASKS)
            .openCursor(IDBKeyRange.bound([jobExecId], [jobExecId, '\uffff']))
        const completedRepos: RepositorySet = new RepositorySet()
        request.onsuccess = () => {
            const cursor = request.result
            if (cursor) {
                const record = cursor.value as JobRepoDoneRecord
                const [owner, name] = record.repo.split('/', 2)
                completedRepos.add({ owner, name })
                cursor.continue()
            } else {
                res(completedRepos)
            }
        }
        request.onerror = rej
    })
}

export async function markRepoJobTaskCompleted(
    jobExecId: string,
    repoId: RepositoryId,
) {
    const db = await connectToDb()
    await new Promise<void>((res, rej) => {
        const tx = db.transaction(
            [DB_STORE_REPO_JOBS, DB_STORE_REPO_JOB_TASKS],
            'readwrite',
        )
        const record: JobRepoDoneRecord = {
            jobExecId,
            repo: `${repoId.owner}/${repoId.name}`,
            whenDone: new Date(),
        }
        const jobLogObjectStore = tx.objectStore(DB_STORE_REPO_JOBS)
        jobLogObjectStore.get(jobExecId).onsuccess = e => {
            const jobLogRecord = (e.target as IDBRequest<JobLogRecord>).result
            jobLogRecord.whenLastActivity = new Date()
            jobLogObjectStore.put(jobLogRecord)
        }
        tx.objectStore(DB_STORE_REPO_JOB_TASKS).add(record)
        tx.oncomplete = () => res()
        tx.onerror = e => {
            console.error('db error', e)
            rej(e)
        }
    })
}

export async function markRepoJobTaskFailed() {}
