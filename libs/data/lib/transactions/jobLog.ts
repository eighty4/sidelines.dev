import type { RepoNameWithOwner } from '@sidelines/model'
import type {
    JobId,
    JobIdForJobKind,
    RepoJobId,
    ScheduledJobId,
    SyncedRefsJobId,
} from '@sidelines/model/jobs/id'
import type {
    RepoJobExecResult,
    SyncedRefsJobExecResult,
} from '@sidelines/model/jobs/result'
import type { RepoJobTarget, SyncedRefsData } from '@sidelines/model/jobs/spec'
import { ulid } from 'ulid'
import type {
    JobLogRecord,
    JobResultRecord,
    JobSchedulingRecord,
} from '../records.ts'
import {
    DB_STORE_JOB_LOG,
    DB_STORE_JOB_RESULT,
    DB_STORE_JOB_SCHEDULING,
} from '../stores.ts'
import {
    idbAddRecord,
    idbGetComputePutRecordWithTx,
    idbGetRecord,
} from '../tx.ts'

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

export type JobProgress<U> = {
    completed: Set<RepoNameWithOwner>
    unfinished: U
}

export type RepoJobProgress = JobProgress<Set<RepoNameWithOwner>>

export type SyncedRefsJobProgress = JobProgress<
    Record<RepoNameWithOwner, SyncedRefsData>
>

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
        whenInit: new Date(),
        whenDone: null,
        whenLastActivity: null,
        spec: {
            target,
        },
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
                                target: record.spec.target,
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
    const beforeWhen = minutesAgoDate(minutesSinceLastActivity).getTime()
    return (
        record,
    ): record is JobLogRecord<'repos'> | JobLogRecord<'syncedRefs'> => {
        return (
            !record.whenDone &&
            isReposOrSyncedRefsJobLog(record) &&
            beforeWhen > lastActivityWhen(record)
        )
    }
}

function lastActivityWhen(
    record: JobLogRecord<'repos' | 'syncedRefs'>,
): number {
    return (record.whenLastActivity ?? record.whenInit).getTime()
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
export async function readRepoJobProgressData(
    db: IDBDatabase,
    jobExecId: string,
): Promise<RepoJobProgress['completed']> {
    const logRecord = await idbGetRecord<JobLogRecord<'repos'>>(
        db,
        DB_STORE_JOB_LOG,
        jobExecId,
    )
    if (!logRecord) throw Error()
    if (logRecord.jobKind !== 'repos') throw Error()
    if (logRecord.spec.target.repos === 'single') throw Error()
    return new Promise((res, rej) => {
        const tx = db.transaction(DB_STORE_JOB_RESULT, 'readonly')
        const req: IDBRequest<IDBCursorWithValue | null> = tx
            .objectStore(DB_STORE_JOB_RESULT)
            .openCursor(
                IDBKeyRange.bound([jobExecId, ''], [jobExecId, '\uffff']),
            )
        const completed = new Set<RepoNameWithOwner>()
        req.onsuccess = () => {
            if (req.result) {
                const cursor = req.result
                const resultRecord =
                    cursor.value as JobResultRecord<'syncedRefs'>
                completed.add(resultRecord.repo)
                cursor.continue()
            }
        }
        tx.oncomplete = () => res(completed)
        tx.onerror = rej
    })
}

export async function readSyncedRefsJobProgressData(
    db: IDBDatabase,
    jobExecId: string,
): Promise<SyncedRefsJobProgress> {
    const logRecord = await idbGetRecord<JobLogRecord<'syncedRefs'>>(
        db,
        DB_STORE_JOB_LOG,
        jobExecId,
    )
    if (!logRecord) throw Error()
    if (logRecord.jobKind !== 'syncedRefs') throw Error()
    return new Promise((res, rej) => {
        const tx = db.transaction(DB_STORE_JOB_RESULT, 'readonly')
        const req: IDBRequest<IDBCursorWithValue | null> = tx
            .objectStore(DB_STORE_JOB_RESULT)
            .openCursor(
                IDBKeyRange.bound([jobExecId, ''], [jobExecId, '\uffff']),
            )
        const result: SyncedRefsJobProgress = {
            completed: new Set(),
            unfinished: logRecord.spec.repos,
        }
        req.onsuccess = () => {
            if (req.result) {
                const cursor = req.result
                const resultRecord =
                    cursor.value as JobResultRecord<'syncedRefs'>
                result.completed.add(resultRecord.repo)
                delete result.unfinished[resultRecord.repo]
                cursor.continue()
            }
        }
        tx.oncomplete = () => res(result)
        tx.onerror = rej
    })
}

export function setRepoJobExecResult(
    db: IDBDatabase,
    jobExecId: string,
    repo: RepoNameWithOwner,
    result: RepoJobExecResult,
): Promise<Date> {
    return new Promise((res, rej) => {
        const tx = db.transaction(
            [DB_STORE_JOB_LOG, DB_STORE_JOB_RESULT],
            'readwrite',
        )
        const jobLogStore = tx.objectStore(DB_STORE_JOB_LOG)
        const req: IDBRequest<JobLogRecord<'repos'> | null> =
            jobLogStore.get(jobExecId)
        const whenLastActivity = new Date()
        req.onsuccess = () => {
            const record = req.result
            if (record === null) {
                throw Error('not found')
            }
            if (record.jobKind !== 'repos') {
                throw Error('not a repo job')
            }
            tx.objectStore(DB_STORE_JOB_RESULT).add({
                jobExecId,
                whenDone: ulid(whenLastActivity.getTime()),
                repo,
                jobKind: 'repos',
                result,
            } satisfies JobResultRecord<'repos'>)
            record.whenLastActivity = whenLastActivity
            jobLogStore.put(record)
        }
        tx.oncomplete = () => res(whenLastActivity)
        tx.onerror = rej
    })
}

export function setSyncedRefsJobExecResult(
    db: IDBDatabase,
    jobExecId: string,
    repo: RepoNameWithOwner,
    result: SyncedRefsJobExecResult,
): Promise<Date> {
    return new Promise((res, rej) => {
        const tx = db.transaction(
            [DB_STORE_JOB_LOG, DB_STORE_JOB_RESULT],
            'readwrite',
        )
        const jobLogStore = tx.objectStore(DB_STORE_JOB_LOG)
        const req: IDBRequest<JobLogRecord<'syncedRefs'> | null> =
            jobLogStore.get(jobExecId)
        const whenLastActivity = new Date()
        req.onsuccess = () => {
            const record = req.result
            if (record === null) {
                throw Error('not found')
            }
            if (record.jobKind !== 'syncedRefs') {
                throw Error('not a syncedRefs job')
            }
            tx.objectStore(DB_STORE_JOB_RESULT).add({
                jobExecId,
                whenDone: ulid(whenLastActivity.getTime()),
                repo,
                jobKind: 'syncedRefs',
                result,
                syncedRefs: record.spec.repos[repo],
            } satisfies JobResultRecord<'syncedRefs'>)
            record.whenLastActivity = whenLastActivity
            jobLogStore.put(record)
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
            const record = (e.target as IDBRequest<JobLogRecord<any> | null>)
                .result
            if (!record) {
                throw Error('not found')
            }
            record.whenDone = whenDone
            if (isReposOrSyncedRefsJobLog(record)) {
                record.whenLastActivity = whenDone
            } else {
                markScheduledJobDone(tx, record.jobId)
            }
            objectStore.put(record)
        }
        tx.oncomplete = () => res(whenDone)
        tx.onerror = rej
    })
}

function isReposOrSyncedRefsJobLog(
    record: JobLogRecord<any>,
): record is JobLogRecord<'repos' | 'syncedRefs'> {
    return record.jobKind !== 'scheduled'
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
