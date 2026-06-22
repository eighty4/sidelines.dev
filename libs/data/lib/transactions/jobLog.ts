import type {
    JobExecState,
    RepoJobExecStatus,
    RepoJobId,
    RepoJobTarget,
    RepoNameWithOwner,
} from '@sidelines/model'
import {
    connectToDb,
    DB_STORE_JOB_LOG,
    idbAddRecord,
    idbGetRecord,
} from '../database.ts'

// retrieve a model of incomplete jobs from a previous browser session
// used to initialize the SharedWorker of JobsSWorkerBackend
export type OutstandingJobs = {
    repos: Array<{
        jobId: RepoJobId
        jobExecId: string
        target: RepoJobTarget
    }>
}

// DB_STORE_JOB_LOG
export type JobLogRecord = {
    // DB_STORE_JOB_LOG_KEY
    jobExecId: string

    jobId: RepoJobId
    whenInit: Date
    whenLastActivity?: Date
    whenDone?: Date
} & JobExecState

export async function createRepoJobLog(
    jobId: RepoJobId,
    jobExecId: string,
    target: RepoJobTarget,
): Promise<void> {
    await createJobLog({
        jobId,
        jobExecId,
        kind: 'repo',
        target,
        whenInit: new Date(),
        repos: {},
    })
}

async function createJobLog(record: JobLogRecord) {
    await idbAddRecord<JobLogRecord>(DB_STORE_JOB_LOG, record)
}

// not happy about returning the record type
export async function readJobExec(
    jobExecId: string,
): Promise<JobLogRecord | null> {
    return await idbGetRecord(DB_STORE_JOB_LOG, jobExecId)
}

// returns jobs matching criteria for `whenDone` and `whenLastActivity`
export async function readOutsandingJobs(
    minutesSinceLastActivity?: number,
): Promise<OutstandingJobs> {
    const db = await connectToDb()
    return await new Promise((res, rej) => {
        const request: IDBRequest<IDBCursorWithValue | null> = db
            .transaction(DB_STORE_JOB_LOG, 'readonly')
            .objectStore(DB_STORE_JOB_LOG)
            .openCursor()
        const predicate = outstandingJobPredicate(minutesSinceLastActivity)
        const result: OutstandingJobs = {
            repos: [],
        }
        request.onsuccess = () => {
            const cursor = request.result
            if (cursor) {
                const record = cursor.value as JobLogRecord
                if (predicate(record)) {
                    switch (record.kind) {
                        case 'repo':
                            result.repos.push({
                                jobId: record.jobId,
                                jobExecId: record.jobExecId,
                                target: record.target,
                            })
                            break
                        case 'refs':
                        case 'schedule':
                            break
                    }
                }
                cursor.continue()
            } else {
                res(result)
            }
        }
        request.onerror = rej
    })
}

function outstandingJobPredicate(
    minutesSinceLastActivity?: number,
): (record: JobLogRecord) => boolean {
    if (minutesSinceLastActivity) {
        const lastActivityCutoff = minutesAgoDate(
            minutesSinceLastActivity,
        ).getTime()
        return record =>
            !record.whenDone &&
            lastActivityCutoff <
                (record.whenLastActivity ?? record.whenInit).getTime()
    } else {
        return record => !record.whenDone
    }
}

function minutesAgoDate(minutes: number): Date {
    const date = new Date()
    date.setTime(date.getTime() - minutes * 60 * 1000)
    return date
}

// returns all of a job's completed repos
// used when restarting a repo job to diff with all viewer repos
export async function readRepoJobReposCompleted(
    jobExecId: string,
): Promise<Set<RepoNameWithOwner>> {
    const db = await connectToDb()
    return await new Promise((res, rej) => {
        const tx = db.transaction(DB_STORE_JOB_LOG, 'readonly')
        const req: IDBRequest<JobLogRecord> = db
            .transaction(DB_STORE_JOB_LOG, 'readonly')
            .objectStore(DB_STORE_JOB_LOG)
            .get(jobExecId)

        req.onsuccess = () => {
            if (req.result === null) {
                throw Error('not found')
            }
            if (req.result.kind !== 'repo') {
                throw Error('not a repo job')
            }
            res(
                new Set(
                    Object.keys(req.result.repos) as Array<RepoNameWithOwner>,
                ),
            )
        }
        tx.onerror = rej
    })
}

export async function markRepoJobStatus(
    jobExecId: string,
    repo: RepoNameWithOwner,
    status: RepoJobExecStatus,
): Promise<Date> {
    const db = await connectToDb()
    return await new Promise((res, rej) => {
        const tx = db.transaction(DB_STORE_JOB_LOG, 'readwrite')
        const objectStore = tx.objectStore(DB_STORE_JOB_LOG)
        const req: IDBRequest<JobLogRecord> = tx
            .objectStore(DB_STORE_JOB_LOG)
            .get(jobExecId)
        const whenLastActivity = new Date()
        req.onsuccess = () => {
            if (req.result === null) {
                throw Error('not found')
            }
            if (req.result.kind !== 'repo') {
                throw Error('not a repo job')
            }
            req.result.repos[repo] = status
            req.result.whenLastActivity = new Date()
            objectStore.put(req.result)
        }
        tx.oncomplete = () => res(whenLastActivity)
        tx.onerror = rej
    })
}

export async function markJobDone(jobExecId: string): Promise<void> {
    const db = await connectToDb()
    await new Promise<void>((res, rej) => {
        const tx = db.transaction(DB_STORE_JOB_LOG, 'readwrite')
        const objectStore = tx.objectStore(DB_STORE_JOB_LOG)
        tx.objectStore(DB_STORE_JOB_LOG).get(jobExecId).onsuccess = e => {
            const record = (e.target as IDBRequest<JobLogRecord>).result
            record.whenLastActivity = record.whenDone = new Date()
            objectStore.put(record)
        }
        tx.oncomplete = () => res()
        tx.onerror = rej
    })
}
