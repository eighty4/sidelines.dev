import type {
    JobId,
    JobIdForJobKind,
    RepoJobExecResult,
    RepoJobId,
    RepoJobTarget,
    RepoNameWithOwner,
    ScheduledJobId,
    SyncedRefsData,
    SyncedRefsJobExecResult,
    SyncedRefsJobId,
} from '@sidelines/model'
import {
    DB_STORE_JOB_LOG,
    DB_STORE_JOB_SCHEDULING,
    idbAddRecord,
    idbGetComputePutRecordWithTx,
    idbGetRecord,
} from '../database.ts'
import type { JobLogRecord, JobSchedulingRecord } from '../records.ts'

// retrieve a model of incomplete jobs from a previous browser session
// used to initialize the SharedWorker of JobsSWorkerBackend
export type OutstandingJobs = {
    // repo jobs will be restarted by collecting all of the viewer repos
    // at the time of restart and filtering out completed repos
    repos: Array<{
        jobId: RepoJobId
        jobExecId: string
        target: RepoJobTarget
    }>
    // synced refs jobs store their target repos and refs to run on
    // in the db and restart by reading the job log record before launching
    syncedRefs: Array<{
        jobId: SyncedRefsJobId
        jobExecId: string
    }>
}

export function createRepoJobLog(
    db: IDBDatabase,
    jobId: RepoJobId,
    jobExecId: string,
    target: RepoJobTarget,
): Promise<void> {
    return idbAddRecord<JobLogRecord<'repos'>>(db, DB_STORE_JOB_LOG, {
        jobId,
        jobExecId,
        jobKind: 'repos',
        target,
        whenInit: new Date(),
        repos: {},
        whenDone: null,
        whenLastActivity: null,
    })
}

export function createScheduledJobLog(
    db: IDBDatabase,
    jobId: ScheduledJobId,
    jobExecId: string,
): Promise<void> {
    return new Promise((res, rej) => {
        const tx = db.transaction(
            [DB_STORE_JOB_LOG, DB_STORE_JOB_SCHEDULING],
            'readwrite',
        )
        const whenInit = new Date()
        tx.objectStore(DB_STORE_JOB_LOG).add({
            jobId,
            jobExecId,
            jobKind: 'scheduled',
            whenInit,
            whenDone: null,
        } satisfies JobLogRecord<'scheduled'>)
        tx.objectStore(DB_STORE_JOB_SCHEDULING).put({
            jobId,
            completed: null,
            whenInit,
        } satisfies JobSchedulingRecord)
        tx.oncomplete = () => res()
        tx.onerror = rej
    })
}

// not happy about returning the record type
export function readJobExec(
    db: IDBDatabase,
    jobExecId: string,
): Promise<JobLogRecord | null> {
    return idbGetRecord(db, DB_STORE_JOB_LOG, jobExecId)
}

export async function readSyncedRefsJobData(
    db: IDBDatabase,
    jobExecId: string,
): Promise<{
    completed: Set<RepoNameWithOwner>
    unfinished: Record<RepoNameWithOwner, SyncedRefsData>
}> {
    const jobLogRecord = await idbGetRecord<JobLogRecord>(
        db,
        DB_STORE_JOB_LOG,
        jobExecId,
    )
    if (!jobLogRecord) throw Error()
    if (jobLogRecord.jobKind !== 'syncedRefs') throw Error()

    const completed = new Set<RepoNameWithOwner>()
    const unfinished = Object.fromEntries(
        Object.entries(jobLogRecord.repos)
            .filter(([repo, state]) => {
                if (state.result) {
                    completed.add(repo as RepoNameWithOwner)
                    return false
                } else {
                    return true
                }
            })
            .map(([repo, state]) => [
                repo,
                { to: state.to, from: state.from } satisfies SyncedRefsData,
            ]),
    )
    return { completed, unfinished }
}

// returns jobs matching criteria for `whenDone` and `whenLastActivity`
export function readOutsandingJobs(
    db: IDBDatabase,
    minutesSinceLastActivity: number,
): Promise<OutstandingJobs> {
    return new Promise((res, rej) => {
        const request: IDBRequest<IDBCursorWithValue | null> = db
            .transaction(DB_STORE_JOB_LOG, 'readonly')
            .objectStore(DB_STORE_JOB_LOG)
            .openCursor()
        const predicate = makeOutstandingJobPredicate(minutesSinceLastActivity)
        const result: OutstandingJobs = {
            repos: [],
            syncedRefs: [],
        }
        request.onsuccess = () => {
            const cursor = request.result
            if (cursor) {
                const record = cursor.value as JobLogRecord
                if (predicate(record)) {
                    switch (record.jobKind) {
                        case 'repos':
                            result.repos.push({
                                jobId: record.jobId as JobIdForJobKind<'repos'>,
                                jobExecId: record.jobExecId,
                                target: record.target,
                            })
                            break
                        case 'syncedRefs':
                            result.syncedRefs.push({
                                jobExecId: record.jobExecId,
                                jobId: record.jobId,
                            })
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

type OutstandingJobPredicate = (
    record: JobLogRecord,
) => record is JobLogRecord<'repos'> | JobLogRecord<'syncedRefs'>

function makeOutstandingJobPredicate(
    minutesSinceLastActivity: number,
): OutstandingJobPredicate {
    const lastActivity = minutesAgoDate(minutesSinceLastActivity).getTime()
    return (
        record,
    ): record is JobLogRecord<'repos'> | JobLogRecord<'syncedRefs'> =>
        record.whenDone === null &&
        record.jobKind !== 'scheduled' &&
        isTimestampBeforeDate(
            lastActivity,
            record.whenLastActivity ?? record.whenInit,
        )
}

function isTimestampBeforeDate(time: number, date: Date): boolean {
    return time < date.getTime()
}

function minutesAgoDate(minutes: number): Date {
    const date = new Date()
    date.setTime(date.getTime() - minutes * 60 * 1000)
    return date
}

// returns all of a job's completed repos
// used when restarting a repo job to diff with all viewer repos
// completed is determined by the repo having a result state
// some result states require user interaction but they are
// still taxonomically completed in terms of restarting the job
export function readRepoJobReposCompleted(
    db: IDBDatabase,
    jobExecId: string,
): Promise<Set<RepoNameWithOwner>> {
    return new Promise((res, rej) => {
        const tx = db.transaction(DB_STORE_JOB_LOG, 'readonly')
        const req: IDBRequest<JobLogRecord> = db
            .transaction(DB_STORE_JOB_LOG, 'readonly')
            .objectStore(DB_STORE_JOB_LOG)
            .get(jobExecId)

        req.onsuccess = () => {
            if (req.result === null) {
                throw Error('not found')
            }
            if (req.result.jobKind !== 'repos') {
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

export function markRepoJobStatus(
    db: IDBDatabase,
    jobExecId: string,
    repo: RepoNameWithOwner,
    status: RepoJobExecResult,
): Promise<Date> {
    return new Promise((res, rej) => {
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
            if (req.result.jobKind !== 'repos') {
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

export function markSyncedRefsJobStatus(
    db: IDBDatabase,
    jobExecId: string,
    repo: RepoNameWithOwner,
    status: SyncedRefsJobExecResult,
): Promise<Date> {
    return new Promise((res, rej) => {
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
            if (req.result.jobKind !== 'syncedRefs') {
                throw Error('not a syncedRefs job')
            }
            req.result.repos[repo].result = status
            req.result.whenLastActivity = new Date()
            objectStore.put(req.result)
        }
        tx.oncomplete = () => res(whenLastActivity)
        tx.onerror = rej
    })
}

export function markJobDone(db: IDBDatabase, jobExecId: string): Promise<Date> {
    return new Promise((res, rej) => {
        const tx = db.transaction(
            [DB_STORE_JOB_LOG, DB_STORE_JOB_SCHEDULING],
            'readwrite',
        )
        const objectStore = tx.objectStore(DB_STORE_JOB_LOG)
        const whenDone = new Date()
        tx.objectStore(DB_STORE_JOB_LOG).get(jobExecId).onsuccess = e => {
            const record = (e.target as IDBRequest<JobLogRecord>).result
            record.whenDone = whenDone
            if (record.jobKind === 'scheduled') {
                markScheduledJobDone(tx, record.jobId)
            } else {
                record.whenLastActivity = whenDone
            }
            objectStore.put(record)
        }
        tx.oncomplete = () => res(whenDone)
        tx.onerror = rej
    })
}

function markScheduledJobDone(tx: IDBTransaction, jobId: JobId) {
    idbGetComputePutRecordWithTx<JobSchedulingRecord>(
        tx,
        DB_STORE_JOB_SCHEDULING,
        jobId,
        record => {
            record!.completed = true
            return record!
        },
    )
}

export function readScheduledJobRuns(
    db: IDBDatabase,
): Promise<Record<ScheduledJobId, Date>> {
    return new Promise((res, rej) => {
        const req: IDBRequest<IDBCursorWithValue | null> = db
            .transaction(DB_STORE_JOB_SCHEDULING, 'readonly')
            .objectStore(DB_STORE_JOB_SCHEDULING)
            .openCursor()

        const result: Record<ScheduledJobId, Date> = {}

        req.onsuccess = () => {
            const cursor = req.result
            if (cursor) {
                const record = cursor.value as JobSchedulingRecord
                if (record.completed) {
                    result[record.jobId] = record.whenInit
                }
                cursor.continue()
            } else {
                res(result)
            }
        }
        req.onerror = rej
    })
}
