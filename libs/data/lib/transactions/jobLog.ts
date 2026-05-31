import type {
    RepositoryId,
    RepoJobExecStatus,
    RepoJobId,
    RepoNameWithOwner,
    SyncedRefsJobExecStatus,
} from '@sidelines/model'
import { connectToDb, DB_STORE_JOB_LOG, idbAddRecord } from '../database.ts'

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
          repos: Record<RepoNameWithOwner, RepoJobExecStatus>
      }
    | {
          kind: 'refs'
          repos: Record<RepoNameWithOwner, SyncedRefsJobExecStatus>
      }
)

export async function createJobLogRecord(
    jobId: RepoJobId,
    jobExecId: string,
    kind: JobLogRecord['kind'],
): Promise<void> {
    await idbAddRecord<JobLogRecord>(
        DB_STORE_JOB_LOG,
        createRecord(jobId, jobExecId, kind),
    )
}

function createRecord(
    jobId: RepoJobId,
    jobExecId: string,
    kind: JobLogRecord['kind'],
) {
    switch (kind) {
        case 'schedule':
            return {
                jobId,
                jobExecId,
                whenInit: new Date(),
                kind,
            }
        case 'refs':
        case 'repo':
            return {
                jobId,
                jobExecId,
                whenInit: new Date(),
                kind,
                repos: {},
            }
    }
}

// returns array of `jobExecId` that match certain criteria for `whenDone` and `whenLastActivity`
export async function readRepoJobsUncompleted(): Promise<Array<string>> {
    const db = await connectToDb()
    return await new Promise((res, rej) => {
        const request: IDBRequest<IDBCursorWithValue | null> = db
            .transaction(DB_STORE_JOB_LOG, 'readonly')
            .objectStore(DB_STORE_JOB_LOG)
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
    const toCompare = record.whenLastActivity ?? record.whenInit
    return toCompare.getTime() < tenMinsAgo.getTime()
}

// returns all of job's repos resolved with a completion state
// used when restarting a job to diff with all viewer repos
export async function readRepoJobCompletedRepos(
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
