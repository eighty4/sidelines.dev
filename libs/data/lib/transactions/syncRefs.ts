import {
    AvailableJobCriteria,
    type AvailableJobCriterion,
    type AvailableJobsReq,
    type AvailableJobsRes,
    type BranchRef,
    type DataCallback,
    type RepoNameWithOwner,
    type SyncedRefsData,
    type SyncedRefsJobId,
} from '@sidelines/model'
import {
    makeAwaitMessageAndCloseChannel,
    makeNeverCloseAndSubscribeChannel,
    makePostAndCloseChannel,
} from '@sidelines/model/channels'
import { ulid } from 'ulid'
import { DB_STORE_JOB_LOG, DB_STORE_REPO_HEADS } from '../database.ts'
import type { JobLogRecord, RepoHeadRecord } from '../records.ts'

export type SyncRefsInput = {
    criteria: Set<AvailableJobCriterion>
    defaultBranch: BranchRef
    repo: RepoNameWithOwner
}

export type SyncedRefsJobLaunch = {
    jobId: SyncedRefsJobId
    jobExecId: string
}

// fn for jobs backend to subscribe to syncedRefs
export function onSyncedRefs(
    cb: DataCallback<Array<SyncedRefsJobLaunch>>,
): void {
    makeNeverCloseAndSubscribeChannel(cn(), (d: Array<SyncedRefsJobLaunch>) => {
        cb(d)
    })
}

function cn(): 'sl.job.syncedRefs' {
    return 'sl.job.syncedRefs'
}

// opens cursor on repo heads store and creates entries in job log for updated refs
export async function syncRefs(
    db: IDBDatabase,
    reposToRefs: Record<RepoNameWithOwner, SyncRefsInput>,
): Promise<void> {
    const syncedRefsJobLaunches = await performSyncWithDb(
        db,
        reposToRefs,
        await getAvailableSyncedRefsJobs(),
    )
    if (syncedRefsJobLaunches?.length) {
        makePostAndCloseChannel(cn(), syncedRefsJobLaunches)
    }
}

async function getAvailableSyncedRefsJobs(): Promise<
    AvailableJobsRes<'syncedRefs'>
> {
    const requestingJobIds = makeAwaitMessageAndCloseChannel<
        AvailableJobsRes<'syncedRefs'>
    >('sl.job.data.syncedRefsJobIds.res')
    makePostAndCloseChannel('sl.job.data.syncedRefsJobIds.req', {
        jobKind: 'syncedRefs',
    } satisfies AvailableJobsReq<'syncedRefs'>)
    return await requestingJobIds
}

function performSyncWithDb(
    db: IDBDatabase,
    reposToRefs: Record<RepoNameWithOwner, SyncRefsInput>,
    availableJobs: AvailableJobsRes<'syncedRefs'>,
): Promise<Array<SyncedRefsJobLaunch> | null> {
    return new Promise(async (res, rej) => {
        const tx = db.transaction(
            [DB_STORE_JOB_LOG, DB_STORE_REPO_HEADS],
            'readwrite',
        )
        const repoHeadStore = tx.objectStore(DB_STORE_REPO_HEADS)

        let jobsToLaunch: Array<SyncedRefsJobLaunch> | null

        tx.oncomplete = () => {
            console.log(
                '@sidelines/data/tx/syncRefs tx complete, synced',
                Object.keys(syncedRefs).length,
                'repos',
            )
            res(jobsToLaunch)
        }

        tx.onerror = e => {
            console.log('syncRefs tx error', e)
            rej(e)
        }

        const repoHeadsReq = repoHeadStore.openCursor()
        const syncedRefs: Record<RepoNameWithOwner, SyncedRefsData> = {}

        // deletes from reposToRefs if repo head is up to date
        // the remainder is executed for syncedRefs jobs
        repoHeadsReq.onsuccess = () => {
            const cursor = repoHeadsReq.result
            if (cursor) {
                onRepoHeadCursorWithValue(cursor, reposToRefs, syncedRefs)
            } else {
                addRepoHeadRecords(repoHeadStore, reposToRefs, syncedRefs)
                jobsToLaunch = addJobLogRecords(
                    tx.objectStore(DB_STORE_JOB_LOG),
                    reposToRefs,
                    syncedRefs,
                    availableJobs,
                )
            }
        }
    })
}

/*****************************************************************************/
/*** FOLLOWING FNS CANNOT BE ASYNC!!! MUST BE SYNCHRONOUS TO RUN WITHIN TX ***/
/*****************************************************************************/

function isSameRef(a: BranchRef, b: BranchRef): boolean {
    return a.headOid === b.headOid && a.name === b.name
}

function onRepoHeadCursorWithValue(
    cursor: IDBCursorWithValue,
    reposToRefs: Record<RepoNameWithOwner, SyncRefsInput>,
    syncedRefs: Record<RepoNameWithOwner, SyncedRefsData>,
) {
    const record = cursor.value as RepoHeadRecord
    const syncRefsInputs = reposToRefs[record.repo]
    if (syncRefsInputs) {
        const { defaultBranch, repo } = syncRefsInputs
        if (isSameRef(defaultBranch, record.defaultBranch)) {
            delete reposToRefs[repo]
        } else {
            syncedRefs[repo] = { from: record.defaultBranch, to: defaultBranch }
            cursor.update({ repo, defaultBranch } satisfies RepoHeadRecord)
        }
    }
    cursor.continue()
}

function addRepoHeadRecords(
    repoHeadStore: IDBObjectStore,
    reposToRefs: Readonly<Record<RepoNameWithOwner, SyncRefsInput>>,
    syncedRefs: Record<RepoNameWithOwner, SyncedRefsData>,
) {
    for (const { defaultBranch, repo } of Object.values(reposToRefs)) {
        repoHeadStore.add({ repo, defaultBranch } satisfies RepoHeadRecord)
        syncedRefs[repo] = { to: defaultBranch }
    }
}

function addJobLogRecords(
    jobLogStore: IDBObjectStore,
    reposToRefs: Readonly<Record<RepoNameWithOwner, SyncRefsInput>>,
    syncedRefs: Readonly<Record<RepoNameWithOwner, SyncedRefsData>>,
    availableSyncedRefsJobs: AvailableJobsRes<'syncedRefs'>,
): Array<SyncedRefsJobLaunch> | null {
    if (!Object.keys(syncedRefs).length) {
        return null
    }
    // build lookup records
    const jobsToCreate: Record<
        SyncedRefsJobId,
        Record<RepoNameWithOwner, SyncedRefsData> | null
    > = Object.fromEntries(
        availableSyncedRefsJobs.jobs.map(j => [j.jobId, null]),
    )
    const jobIdsWithoutCriteria: Array<SyncedRefsJobId> = []
    const jobIdsByCriteria: Record<
        AvailableJobCriterion,
        Array<SyncedRefsJobId>
    > = Object.fromEntries(
        AvailableJobCriteria.map(criterion => [
            criterion,
            availableSyncedRefsJobs.jobs
                .filter(j => {
                    if (j.critiera) {
                        return j.critiera[criterion]
                    } else {
                        jobIdsWithoutCriteria.push(j.jobId)
                        return false
                    }
                })
                .map(j => j.jobId),
        ]),
    ) as Record<AvailableJobCriterion, Array<SyncedRefsJobId>>

    // resolve what jobs to launch for which repos
    for (const { repo, criteria } of Object.values(reposToRefs)) {
        if (criteria?.size) {
            for (const criterion of criteria) {
                for (const jobId of jobIdsByCriteria[criterion]) {
                    if (!jobsToCreate[jobId]) jobsToCreate[jobId] = {}
                    jobsToCreate[jobId][repo] = syncedRefs[repo]
                }
            }
        }
        for (const jobId of jobIdsWithoutCriteria) {
            if (!jobsToCreate[jobId]) jobsToCreate[jobId] = {}
            jobsToCreate[jobId][repo] = syncedRefs[repo]
        }
    }

    // add to object store
    const jobsToLaunch: Array<SyncedRefsJobLaunch> = []
    const whenInit = new Date()
    for (const [jobId, repos] of Object.entries(jobsToCreate)) {
        if (!repos) continue
        const jobExecId = ulid()
        jobLogStore.add({
            jobId: jobId as SyncedRefsJobId,
            jobExecId,
            jobKind: 'syncedRefs',
            repos,
            whenInit,
            whenLastActivity: null,
            whenDone: null,
        } satisfies JobLogRecord)
        jobsToLaunch.push({ jobId: jobId as SyncedRefsJobId, jobExecId })
    }

    return jobsToLaunch
}
