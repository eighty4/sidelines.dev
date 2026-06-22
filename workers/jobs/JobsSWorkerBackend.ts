import {
    createRepoJobLog,
    markJobDone,
    markRepoJobStatus,
    readOutsandingJobs,
    readRepoJobReposCompleted,
} from '@sidelines/data/tx/jobLog'
import {
    createJobUpdateChannel,
    isJobWorkerUpdateMessage,
    type ExecRepoJobMessage,
} from '@sidelines/jobs/messaging'
import {
    joinRepoName,
    type JobId,
    type JobKind,
    type RepoJobId,
    type RepoJobTarget,
    type RepoNameWithOwner,
    type RepositoryId,
} from '@sidelines/model'
import { makeChannel, type SidelinesJobDataCN } from '@sidelines/model/channels'
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

function workerLaunchId(jobId: JobId): WorkerLaunchId {
    switch (jobId) {
        case 'JOB_repos_UPGRADE_ACTIONS':
            return 'JOB_REPO_upgradeWorkflowActions'
        default:
            throw Error()
    }
}

// jobKind to jobExecId to running repo
type RunningJobs = Record<JobKind, Record<string, RunningRepoJob<any>>>

type RunningRepoJob<S extends RunningRepoJobState> = {
    jobId: RepoJobId
    jobExecId: string
    lastActivity: Date
    target: RepoJobTarget
    state: S
}

type RunningRepoJobState =
    | RunningRepoJobStateResolving
    | RunningRepoJobStateLaunching
    | RunningRepoJobStateRunning

type RunningRepoJobStateResolving = { kind: 'resolving' }

type RunningRepoJobStateLaunching = {
    kind: 'launching'
    repos: Set<RepoNameWithOwner>
    completed: Set<RepoNameWithOwner>
}

type RunningRepoJobStateRunning = {
    kind: 'running'
    repos: Set<RepoNameWithOwner>
    completed: Set<RepoNameWithOwner>
}

export default class JobsBackend {
    #channels: Record<JobApiRequest['kind'], Array<BroadcastChannel>> = {
        EXEC: [],
        LS: [],
    }
    #ghToken: string
    #launcher: SharedWorkerSideWorkerLauncher =
        new SharedWorkerSideWorkerLauncher()
    #running: RunningJobs = {
        scheduled: {},
        repos: {},
        syncedRefs: {},
    }
    #updates: BroadcastChannel = createJobUpdateChannel()

    get ghToken(): string {
        return this.#ghToken
    }

    constructor(ghToken: string) {
        this.#ghToken = ghToken
        this.#updates.onmessage = this.#onJobUpdate
        this.#refresh()
    }

    exec(channelId: string, jobId: RepoJobId, repo?: RepositoryId) {
        this.#createChannel('EXEC', channelId)
        const jobExecId = ulid()
        const target: RepoJobTarget = repo
            ? { repos: 'single', repo }
            : { repos: 'owner' }
        createRepoJobLog(jobId, jobExecId, target)
            .then(() => {
                this.#launchRepoJob(jobId, jobExecId, target)
            })
            .catch((e: unknown) => {
                console.error('JobSWorker error initializing exec', e)
            })
    }

    ls(_channelId: string) {
        throw Error('todo')
    }

    hasGhTokenChanged(ghToken: string): boolean {
        return this.ghToken !== ghToken
    }

    shutdown() {
        for (const channels of Object.values(this.#channels)) {
            for (const channel of channels) {
                channel.close()
            }
        }
    }

    #createChannel(kind: JobApiRequest['kind'], channelId: string) {
        const channel = createJobApiChannel(kind, channelId)
        this.#channels[kind].push(channel)
    }

    #launchRepoJob(jobId: RepoJobId, jobExecId: string, target: RepoJobTarget) {
        const job = (this.#running.repos[jobExecId] = {
            jobId,
            jobExecId,
            target,
            lastActivity: new Date(),
            state: {
                kind: 'resolving',
            },
        })
        this.#resolveRepoJobRepos(jobExecId, target).then(launching => {
            job.state = launching
            this.#launcher.request(workerLaunchId(jobId), {
                kind: 'EXEC',
                ghToken: this.#ghToken,
                jobExecId,
                repos: Array.from(
                    launching.repos.difference(launching.completed),
                ),
            } satisfies ExecRepoJobMessage)
        })
    }

    #onJobUpdate = async (e: MessageEvent<unknown>) => {
        if (!isJobWorkerUpdateMessage(e.data)) {
            console.warn(
                'JobSWorker update channel invalid JobWorkerUpdateMessage',
                e.data,
            )
            return
        }
        const { jobKind, kind, jobExecId } = e.data
        switch (jobKind) {
            case 'repos':
                switch (kind) {
                    case 'starting':
                        this.#runningJobLookup<
                            | RunningRepoJobStateLaunching
                            | RunningRepoJobStateRunning
                        >(jobKind, jobExecId, 'launching').state.kind =
                            'running'
                        break
                    case 'status':
                        const runningJob =
                            this.#runningJobLookup<RunningRepoJobStateRunning>(
                                jobKind,
                                jobExecId,
                                'running',
                            )
                        runningJob.state.completed.add(e.data.repo)
                        runningJob.lastActivity = await markRepoJobStatus(
                            jobExecId,
                            e.data.repo,
                            e.data.status,
                        )
                        break
                    case 'complete':
                        console.log(
                            'JobsSWorker job',
                            this.#running[jobKind][jobExecId].jobId,
                            'complete',
                        )
                        await markJobDone(jobExecId)
                        delete this.#running[jobKind][jobExecId]
                        break
                }
                break
            default:
                throw Error('todo')
        }
    }

    // todo outstanding jobs should be all unfinished jobs regardless of timestamp
    async #refresh() {
        try {
            const restartables = await readOutsandingJobs()
            console.log(
                'JobsSWorker read outstanding jobs from indexeddb found',
                restartables,
            )
            for (const { jobId, jobExecId, target } of restartables.repos) {
                this.#launchRepoJob(jobId, jobExecId, target)
            }
        } catch (e) {
            console.error('JobsSWorker refresh error', e)
        }
    }

    async #resolveRepoJobRepos(
        jobExecId: string,
        target: RepoJobTarget,
    ): Promise<RunningRepoJobStateLaunching> {
        if (target.repos === 'single') {
            return {
                kind: 'launching',
                completed: new Set(),
                repos: new Set([joinRepoName(target.repo)]),
            }
        }
        // todo this SharedWorker calls GitHub API directly
        // const fetchingViewerRepoNames = queryViewerOwnedRepoNames(this.#ghToken)
        const fetchingViewerRepoNames = fetchViewerRepoNames(
            this.#launcher,
            this.#ghToken,
        )
        const completed = await readRepoJobReposCompleted(jobExecId)
        const repos = new Set(await fetchingViewerRepoNames)
        return {
            kind: 'launching',
            completed,
            repos,
        }
    }

    #runningJobLookup<S extends RunningRepoJobState>(
        jobKind: JobKind,
        jobExecId: string,
        expect: S['kind'],
    ): RunningRepoJob<S> {
        const job = this.#running[jobKind][jobExecId]
        if (job.state.kind !== expect) {
            throw Error(`invalid state ${job.state.kind} for job ${jobExecId}`)
        }
        return job
    }
}

// PlayWright does not support intercepting requests in a SharedWorker
// the network requst is delegated to a WorkerLaunch dedicated worker
async function fetchViewerRepoNames(
    launcher: SharedWorkerSideWorkerLauncher,
    ghToken: string,
): Promise<Set<RepoNameWithOwner>> {
    return await new Promise<Set<RepoNameWithOwner>>(res => {
        const c = makeChannel(`sl.job.data.${ulid()}`)
        c.onmessage = (e: MessageEvent<ResolveRepoJobReposWorkerResult>) => {
            c.onmessage = null
            c.close()
            res(new Set(e.data.repos))
        }
        launcher.request('DATA_resolveRepoJobRepos', {
            ghToken,
            channel: c.name as SidelinesJobDataCN,
        } satisfies ResolveRepoJobReposWorkerInit)
    })
}
