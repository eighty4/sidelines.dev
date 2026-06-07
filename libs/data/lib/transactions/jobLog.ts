import type {
    RepositoryId,
    RepoJobExecStatus,
    RepoJobId,
    RepoJobTarget,
    RepoNameWithOwner,
    SyncedRefsJobExecStatus,
} from '@sidelines/model'
import { connectToDb, DB_STORE_JOB_LOG, idbAddRecord } from '../database.ts'

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
type JobLogRecord = {
    jobId: RepoJobId
    jobExecId: string
    whenInit: Date
    whenLastActivity?: Date
    whenDone?: Date
} & (
    | {
          kind: 'schedule'
      }
    | {
          kind: 'repo'
          target: RepoJobTarget
          repos: Record<RepoNameWithOwner, RepoJobExecStatus>
      }
    | {
          kind: 'refs'
          repos: Record<RepoNameWithOwner, SyncedRefsJobExecStatus>
      }
)

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
): Promise<Array<RepositoryId>> {
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
            const completed: Array<RepositoryId> = []
            for (const nameWithOwner of Object.keys(req.result.repos)) {
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
    repo: RepositoryId,
    status: RepoJobExecStatus,
): Promise<void> {
    const db = await connectToDb()
    await new Promise<void>((res, rej) => {
        const tx = db.transaction(DB_STORE_JOB_LOG, 'readwrite')
        const objectStore = tx.objectStore(DB_STORE_JOB_LOG)
        const req: IDBRequest<JobLogRecord> = tx
            .objectStore(DB_STORE_JOB_LOG)
            .get(jobExecId)
        req.onsuccess = () => {
            if (req.result === null) {
                throw Error('not found')
            }
            if (req.result.kind !== 'repo') {
                throw Error('not a repo job')
            }
            req.result.repos[`${repo.owner}/${repo.name}`] = status
            req.result.whenLastActivity = new Date()
            objectStore.put(req.result)
        }
        tx.oncomplete = () => res()
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
