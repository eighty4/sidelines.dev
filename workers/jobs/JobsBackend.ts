import {
    createRepoJobLog,
    createScheduledJobLog,
    markJobDone,
    setRepoJobExecResult,
    setSyncedRefsJobExecResult,
    readOutsandingJobs,
    readRepoJobProgressData,
    readScheduledJobRuns,
    readSyncedRefsJobProgressData,
    type RepoJobProgress,
    type SyncedRefsJobProgress,
} from '@sidelines/data/tx/jobLog'
import {
    onSyncedRefs,
    type SyncedRefsJobLaunch,
} from '@sidelines/data/tx/syncRefs'
import {
    isJobWorkerUpdate,
    type ExecRepoJobMessage,
    type ExecScheduledJobMessage,
    type ExecSyncedRefsJobMessage,
    type JobWorkerUpdateComplete,
    type JobWorkerUpdateStarting,
    type RepoJobWorkerUpdate,
    type ScheduledJobWorkerUpdate,
    type SyncedRefsJobWorkerUpdate,
} from '@sidelines/jobs/messaging'
import {
    joinRepoName,
    type RepoNameWithOwner,
    type RepositoryId,
} from '@sidelines/model'
import {
    makeAwaitMessageAndCloseChannel,
    makeChannel,
    makeNeverCloseAndSubscribeChannel,
    type SidelinesJobDataCN,
} from '@sidelines/model/channels'
import type {
    AvailableJob,
    AvailableJobsRes,
    JobKindForAvailableJobs,
} from '@sidelines/model/jobs/available'
import type {
    JobId,
    JobIdForJobKind,
    RepoJobId,
    ScheduledJobId,
    SyncedRefsJobId,
} from '@sidelines/model/jobs/id'
import type { JobKind } from '@sidelines/model/jobs/kind'
import type { RepoJobTarget } from '@sidelines/model/jobs/spec'
import { ulid } from 'ulid'
import {
    SharedWorkerSideWorkerLauncher,
    type WorkerLaunchId,
} from '../WorkerLaunch.ts'
import { createJobApiChannel, type JobApiRequest } from './jobApiMessaging.ts'
import type {
    ResolveRepoJobReposWorkerInit,
    ResolveRepoJobReposWorkerResult,
} from './ResolveRepoJobReposWorker.ts'

declare const self: SharedWorkerGlobalScope

// minutes from last activity to restarting a job
const MINS_RESTART = 0.5
// minutes between running sync refs
const MINS_SYNC = 1

function workerLaunchId(jobId: JobId): WorkerLaunchId {
    switch (jobId) {
        case 'JOB_repos_UPGRADE_ACTIONS':
            return 'JOB_REPO_upgradeWorkflowActions'
        case 'JOB_scheduled_SYNC_REFS':
            return 'JOB_SCHEDULED_sync_refs'
        case 'JOB_syncedRefs_PACKAGES':
            return 'JOB_SYNC_packages'
        case 'JOB_syncedRefs_WATCHES':
            return 'JOB_SYNC_watches'
        default:
            throw Error(`JobId ${jobId} is missing a WorkerLaunchId`)
    }
}

type AvailableJobs = {
    [JK in JobKindForAvailableJobs]: Array<AvailableJob<JK>>
}

function createAvailableJobs(): AvailableJobs {
    return {
        repos: [
            {
                jobId: 'JOB_repos_UPGRADE_ACTIONS',
            },
        ],
        syncedRefs: [
            {
                jobId: 'JOB_syncedRefs_PACKAGES',
            },
            {
                jobId: 'JOB_syncedRefs_WATCHES',
                critiera: {
                    watch: true,
                },
            },
        ],
    }
}

function createSchedules(): ScheduledJobs {
    return {
        JOB_scheduled_SYNC_REFS: {
            interval: MINS_SYNC * 60 * 1000,
        },
    }
}

type ScheduledJobs = Record<
    ScheduledJobId,
    {
        interval: number
        lastRun?: Date
    }
>

type RunningJobs = {
    [JK in JobKind]: RunningJobsForJobKind<JK>
}

class RunningJobsForJobKind<JK extends JobKind> {
    #jobs: RunningJobsForJobKindMap<JK> = {}

    addResolving(
        jobExecId: string,
        jobId: JobIdForJobKind<JK>,
        state: RunningJobState<JK, 'resolving'>,
    ): RunningJob<JK, 'resolving'> {
        return (this.#jobs[jobExecId] = {
            jobExecId,
            jobId,
            state,
        })
    }

    removeComplete(jobExecId: string): void {
        delete this.#jobs[jobExecId]
    }

    transitionToLaunching(
        jobExecId: string,
        state: RunningJobState<JK, 'launching'>,
    ) {
        const job = this.#jobs[jobExecId]
        if (job.state.kind !== 'resolving') {
            throw TypeError()
        }
        job.state = state
    }

    transitionToRunning(
        jobExecId: string,
        state: RunningJobState<JK, 'running'>,
    ) {
        const job = this.#jobs[jobExecId]
        if (job.state.kind !== 'launching') {
            throw TypeError()
        }
        job.state = state
    }

    computeTransitionToRunning(
        jobExecId: string,
        stateFn: (
            prev: RunningJobState<JK, 'launching'>,
        ) => RunningJobState<JK, 'running'>,
    ) {
        const job = this.#jobs[jobExecId]
        if (job.state.kind !== 'launching') {
            throw TypeError()
        }
        job.state = stateFn(job.state)
    }

    async resolveUpdatedRunningState(
        jobExecId: string,
        stateFn: (
            prev: RunningJobState<JK, 'running'>,
        ) => Promise<RunningJobState<JK, 'running'>>,
    ) {
        const job = this.#jobs[jobExecId]
        if (job.state.kind !== 'running') {
            throw TypeError()
        }
        job.state = await stateFn(job.state)
    }
}

type RunningJobsForJobKindMap<JK extends JobKind> = Record<
    string,
    {
        [SK in RunningJobStateKind]: RunningJob<JK, SK>
    }[RunningJobStateKind]
>

type RunningJob<JK extends JobKind, SK extends RunningJobStateKind> = {
    jobId: JobIdForJobKind<JK>
    jobExecId: string
    state: RunningJobState<JK, SK>
}

type RunningJobStateKind = 'resolving' | 'launching' | 'running'

type RunningJobState<
    JK extends JobKind,
    SK extends RunningJobStateKind,
> = RunningJobStates[JK][SK] extends never
    ? { kind: SK }
    : { kind: SK; data: RunningJobStates[JK][SK] }

type RunningJobStates = {
    repos: {
        resolving: {
            target: RepoJobTarget
        }
        launching: {
            progress: RepoJobProgress
            target: RepoJobTarget
        }
        running: {
            lastActivity: Date
            progress: RepoJobProgress
            target: RepoJobTarget
        }
    }
    scheduled: {
        resolving: never
        launching: never
        running: never
    }
    syncedRefs: {
        resolving: never
        launching: {
            progress: SyncedRefsJobProgress
        }
        running: {
            lastActivity: Date
            progress: SyncedRefsJobProgress
        }
    }
}

type JobUpdateChannels = {
    api: Record<JobApiRequest['kind'], Array<BroadcastChannel>>
    jobExecId: Record<string, BroadcastChannel>
}

export default class JobsBackend {
    #available: AvailableJobs = createAvailableJobs()
    #channels: JobUpdateChannels = {
        api: {
            EXEC: [],
            LS: [],
        },
        jobExecId: {},
    }
    #db: IDBDatabase
    #ghToken: string
    #launcher: SharedWorkerSideWorkerLauncher =
        new SharedWorkerSideWorkerLauncher()
    #running: RunningJobs = {
        scheduled: new RunningJobsForJobKind(),
        repos: new RunningJobsForJobKind(),
        syncedRefs: new RunningJobsForJobKind(),
    }
    #schedules: ScheduledJobs = createSchedules()
    #syncedRefsJobIdsRes: BroadcastChannel = makeChannel(
        'sl.job.data.syncedRefsJobIds.res',
    )

    get ghToken(): string {
        return this.#ghToken
    }

    constructor(db: IDBDatabase, ghToken: string) {
        this.#db = db
        this.#ghToken = ghToken
        Promise.allSettled([
            this.#refreshOutstandingJobs(),
            this.#refreshScheduledJobs(),
        ])
        this.#channelSubscriptionsForJobs()
    }

    exec(channelId: string, jobId: RepoJobId, repo?: RepositoryId) {
        this.#createChannel('EXEC', channelId)
        const jobExecId = ulid()
        const target: RepoJobTarget = repo
            ? { repos: 'single', repo }
            : { repos: 'owner' }
        createRepoJobLog(this.#db, jobId, jobExecId, target)
            .then(() => {
                this.#launchRepoJob(jobId, jobExecId, target)
            })
            .catch((e: unknown) => console.error('JobsBackend.exec error', e))
    }

    ls(channelId: string) {
        this.#createChannel('LS', channelId)
    }

    hasGhTokenChanged(ghToken: string): boolean {
        return this.ghToken !== ghToken
    }

    shutdownApiChannels() {
        for (const channels of Object.values(this.#channels.api)) {
            for (const channel of channels) {
                channel.close()
            }
        }
        this.#channels.api.EXEC.length = 0
        this.#channels.api.LS.length = 0
        for (const channel of Object.values(this.#channels.jobExecId)) {
            channel.close()
        }
        this.#channels.jobExecId = {}
    }

    #availableJobs<JK extends JobKindForAvailableJobs>(
        jobKind: JK,
    ): AvailableJobsRes<JK> {
        return {
            jobs: this.#available[jobKind],
        }
    }

    #channelSubscriptionsForJobs() {
        onSyncedRefs(this.#onSyncedRefs)
        makeNeverCloseAndSubscribeChannel(
            'sl.job.worker.update',
            this.#onJobUpdate,
        )
        makeNeverCloseAndSubscribeChannel(
            'sl.job.data.syncedRefsJobIds.req',
            this.#onSyncedRefsJobIdsRequest,
        )
    }

    #createChannel(kind: JobApiRequest['kind'], channelId: string) {
        const channel = createJobApiChannel(kind, channelId)
        this.#channels.api[kind].push(channel)
    }

    #initScheduledJobTiming(
        jobId: ScheduledJobId,
        interval: number,
        timeout?: number,
    ) {
        if (timeout) {
            console.log(
                'JobsBackend.#initScheduledJobTiming launching',
                jobId,
                'in',
                timeout,
                'ms',
            )
            self.setTimeout(() => {
                this.#initScheduledJobTiming(jobId, interval)
                this.#launchScheduledJob(jobId as ScheduledJobId)
            }, timeout)
        } else {
            console.log(
                'JobsBackend.#initScheduledJobTiming relaunching',
                jobId,
                'every',
                interval,
                'ms',
            )
            self.setInterval(() => {
                this.#launchScheduledJob(jobId as ScheduledJobId)
            }, interval)
        }
    }

    #onJobUpdate = async (e: unknown) => {
        if (!isJobWorkerUpdate(e)) {
            console.error(
                'JobsBackend.#onJobUpdate invalid JobWorkerUpdateMessage',
                e,
            )
        } else {
            if (e.kind === 'status') {
                console.log(
                    'JobsBackend.#onJobUpdate',
                    e.kind,
                    e.repo,
                    e.status.state,
                    e.jobId,
                    e.jobExecId,
                )
            } else {
                console.log(
                    'JobsBackend.#onJobUpdate',
                    e.kind,
                    e.jobId,
                    e.jobExecId,
                )
            }
            switch (e.jobKind) {
                case 'repos':
                    await this.#onRepoJobUpdate(e)
                    break
                case 'scheduled':
                    await this.#onScheduledJobUpdate(e)
                    break
                case 'syncedRefs':
                    await this.#onSyncedRefsJobUpdate(e)
                    break
            }
        }
    }

    #launchScheduledJob(jobId: ScheduledJobId) {
        console.log('JobsBackend.#launchScheduledJob', jobId)
        const { jobExecId } = this.#running.scheduled.addResolving(
            ulid(),
            jobId,
            { kind: 'resolving' },
        )
        createScheduledJobLog(this.#db, jobId, jobExecId).then(() => {
            this.#running.scheduled.transitionToLaunching(jobExecId, {
                kind: 'launching',
            })
            this.#launcher.request(workerLaunchId(jobId), {
                kind: 'EXEC',
                ghToken: this.#ghToken,
                jobId,
                jobExecId,
            } satisfies ExecScheduledJobMessage)
        })
    }

    async #onScheduledJobUpdate(e: ScheduledJobWorkerUpdate) {
        switch (e.kind) {
            case 'starting':
                this.#running[e.jobKind].transitionToRunning(e.jobExecId, {
                    kind: 'running',
                })
                this.#onWorkerStarting(e)
                break
            case 'complete':
                this.#running[e.jobKind].removeComplete(e.jobExecId)
                this.#schedules[e.jobId].lastRun = await markJobDone(
                    this.#db,
                    e.jobExecId,
                )
                this.#onWorkerComplete(e)
                break
        }
    }

    #launchRepoJob(jobId: RepoJobId, jobExecId: string, target: RepoJobTarget) {
        console.log(
            'JobsBackend.#launchRepoJob',
            jobId,
            jobExecId,
            'resolving for',
            target.repos === 'single' ? target.repo : 'viewer repos',
        )
        this.#running.repos.addResolving(jobExecId, jobId, {
            kind: 'resolving',
            data: { target },
        })
        this.#resolveRepoJobRepos(jobExecId, target)
            .then(progress => {
                this.#running.repos.transitionToLaunching(jobExecId, {
                    kind: 'launching',
                    data: { progress, target },
                })
                console.log(
                    'JobsBackend.#launchRepoJob',
                    jobId,
                    jobExecId,
                    'launching to run on',
                    progress.unfinished.size,
                    'repos',
                )
                this.#launcher.request(workerLaunchId(jobId), {
                    kind: 'EXEC',
                    ghToken: this.#ghToken,
                    jobId,
                    jobExecId,
                    repos: Array.from(progress.unfinished),
                } satisfies ExecRepoJobMessage)
            })
            .catch(e => {
                console.log(
                    'JobsBackend.#launchRepoJob',
                    jobId,
                    jobExecId,
                    'resolving error',
                    e,
                )
            })
    }

    async #onRepoJobUpdate(e: RepoJobWorkerUpdate) {
        switch (e.kind) {
            case 'starting':
                this.#running.repos.computeTransitionToRunning(
                    e.jobExecId,
                    ({ data }) => ({
                        kind: 'running',
                        data: {
                            lastActivity: new Date(),
                            progress: data.progress,
                            target: data.target,
                        },
                    }),
                )
                this.#onWorkerStarting(e)
                break
            case 'status':
                await this.#running.repos.resolveUpdatedRunningState(
                    e.jobExecId,
                    async running => {
                        running.data.lastActivity = await setRepoJobExecResult(
                            this.#db,
                            e.jobExecId,
                            e.repo,
                            e.status,
                        )
                        running.data.progress.completed.add(e.repo)
                        running.data.progress.unfinished.delete(e.repo)
                        return running
                    },
                )
                break
            case 'complete':
                this.#running[e.jobKind].removeComplete(e.jobExecId)
                await markJobDone(this.#db, e.jobExecId)
                this.#onWorkerComplete(e)
                break
        }
    }

    // JobLogRecord for syncedRefs is always created by @sidelines/data/tx/syncRefs
    #launchSyncedRefsJob(jobId: SyncedRefsJobId, jobExecId: string) {
        console.log(
            'JobsBackend.#launchSyncedRefsJob',
            jobId,
            jobExecId,
            'resolving',
        )
        this.#running.syncedRefs.addResolving(jobExecId, jobId, {
            kind: 'resolving',
        })
        readSyncedRefsJobProgressData(this.#db, jobExecId)
            .then(progress => {
                const unfinishedCount = Object.keys(progress.unfinished).length
                if (!unfinishedCount) {
                    throw Error('no synced refs')
                }
                this.#running.syncedRefs.transitionToLaunching(jobExecId, {
                    kind: 'launching',
                    data: { progress },
                })
                console.log(
                    'JobsBackend.#launchSyncedRefsJob',
                    jobId,
                    jobExecId,
                    'launching to run on',
                    unfinishedCount,
                    'synced refs',
                )
                this.#launcher.request(workerLaunchId(jobId), {
                    kind: 'EXEC',
                    ghToken: this.#ghToken,
                    jobId,
                    jobExecId,
                    repos: progress.unfinished,
                } satisfies ExecSyncedRefsJobMessage)
            })
            .catch(e => {
                console.log(
                    'JobsBackend.#launchSyncedRefsJob',
                    jobId,
                    jobExecId,
                    'resolving error',
                    e,
                )
            })
    }

    async #onSyncedRefsJobUpdate(e: SyncedRefsJobWorkerUpdate) {
        switch (e.kind) {
            case 'starting':
                this.#running.syncedRefs.computeTransitionToRunning(
                    e.jobExecId,
                    ({ data }) => ({
                        kind: 'running',
                        data: {
                            lastActivity: new Date(),
                            progress: data.progress,
                        },
                    }),
                )
                this.#onWorkerStarting(e)
                break
            case 'status':
                await this.#running.syncedRefs.resolveUpdatedRunningState(
                    e.jobExecId,
                    async running => {
                        running.data.lastActivity =
                            await setSyncedRefsJobExecResult(
                                this.#db,
                                e.jobExecId,
                                e.repo,
                                e.status,
                            )
                        running.data.progress.completed.add(e.repo)
                        delete running.data.progress.unfinished[e.repo]
                        return running
                    },
                )
                break
            case 'complete':
                this.#running[e.jobKind].removeComplete(e.jobExecId)
                await markJobDone(this.#db, e.jobExecId)
                this.#onWorkerComplete(e)
                break
        }
    }

    #onSyncedRefs = (jobs: Array<SyncedRefsJobLaunch>) => {
        for (const { jobId, jobExecId } of jobs) {
            this.#launchSyncedRefsJob(jobId, jobExecId)
        }
    }

    #onSyncedRefsJobIdsRequest = () =>
        this.#syncedRefsJobIdsRes.postMessage(this.#availableJobs('syncedRefs'))

    #onWorkerStarting(e: JobWorkerUpdateStarting<JobKind>) {
        console.log(
            'JobsBackend.#onWorkerStarting',
            e.jobId,
            e.jobExecId,
            'starting',
        )
    }

    async #onWorkerComplete(e: JobWorkerUpdateComplete<JobKind>) {
        console.log(
            'JobsBackend.#onWorkerComplete',
            e.jobId,
            e.jobExecId,
            'complete',
        )
    }

    async #refreshOutstandingJobs() {
        try {
            const restartables = await readOutsandingJobs(
                this.#db,
                MINS_RESTART,
            )
            console.log(
                'JobsBackend.#refreshOutstandingJobs outstanding repos',
                restartables.repos.length,
                'syncedRefs',
                restartables.syncedRefs.length,
            )
            for (const { jobId, jobExecId, target } of restartables.repos) {
                this.#launchRepoJob(jobId, jobExecId, target)
            }
            for (const { jobId, jobExecId } of restartables.syncedRefs) {
                this.#launchSyncedRefsJob(jobId, jobExecId)
            }
        } catch (e) {
            console.error('JobsBackend.#refreshOutstandingJobs error', e)
        }
    }

    async #refreshScheduledJobs() {
        try {
            const lastRuns = await readScheduledJobRuns(this.#db)
            const now = Date.now()
            for (const [jobId, schedule] of Object.entries(this.#schedules)) {
                const { interval } = schedule
                schedule.lastRun = lastRuns[jobId as ScheduledJobId]
                if (schedule.lastRun) {
                    const elapsed = now - schedule.lastRun.getTime()
                    if (elapsed < interval) {
                        // timeout before interval if elapsed < interval
                        this.#initScheduledJobTiming(
                            jobId as ScheduledJobId,
                            interval,
                            interval - elapsed,
                        )
                        return
                    }
                }
                // start interval and fire immediately if no prev run or elapsed >= interval
                this.#initScheduledJobTiming(jobId as ScheduledJobId, interval)
                this.#launchScheduledJob(jobId as ScheduledJobId)
            }
        } catch (e) {
            console.error('JobsBackend.#refreshScheduledJobs error', e)
        }
    }

    async #resolveRepoJobRepos(
        jobExecId: string,
        target: RepoJobTarget,
    ): Promise<RepoJobProgress> {
        if (target.repos === 'single') {
            return {
                completed: new Set(),
                unfinished: new Set([joinRepoName(target.repo)]),
            }
        }
        // todo this SharedWorker calls GitHub API directly
        // const fetchingViewerRepoNames = queryViewerOwnedRepoNames(this.#ghToken)
        const fetchingViewerRepoNames = fetchViewerRepoNames(
            this.#launcher,
            this.#ghToken,
        )
        const completed = await readRepoJobProgressData(this.#db, jobExecId)
        return {
            completed,
            unfinished: new Set(await fetchingViewerRepoNames).difference(
                completed,
            ),
        }
    }
}

// PlayWright does not support intercepting requests in a SharedWorker
// the network requst is delegated to a WorkerLaunch dedicated worker
async function fetchViewerRepoNames(
    launcher: SharedWorkerSideWorkerLauncher,
    ghToken: string,
): Promise<Set<RepoNameWithOwner>> {
    const cn: SidelinesJobDataCN = `sl.job.data.viewerRepos.${ulid()}`
    launcher.request('DATA_resolveRepoJobRepos', {
        ghToken,
        channel: cn,
    } satisfies ResolveRepoJobReposWorkerInit)
    const data: ResolveRepoJobReposWorkerResult =
        await makeAwaitMessageAndCloseChannel(cn)
    return new Set(data.repos)
}
