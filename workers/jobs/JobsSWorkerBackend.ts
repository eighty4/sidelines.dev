import {
    createRepoJobLog,
    markJobDone,
    markRepoJobStatus,
    readOutsandingJobs,
} from '@sidelines/data/tx/jobLog'
import {
    createUpdateChannel,
    isJobWorkerUpdateMessage,
    type ExecRepoJobMessage,
} from '@sidelines/jobs/messaging'
import type { JobId, JobKind, RepoJobId, RepositoryId } from '@sidelines/model'
import { ulid } from 'ulid'
import {
    SharedWorkerSideWorkerLauncher,
    type WorkerLaunchId,
} from '../WorkerLaunch.ts'
import { createJobApiChannel, type JobApiRequest } from './jobApiMessaging.ts'

function workerLaunchId(jobId: JobId): WorkerLaunchId {
    switch (jobId) {
        case 'JOB_repos_UPGRADE_ACTIONS':
            return 'JOB_REPO_upgradeWorkflowActions'
        default:
            throw Error()
    }
}

// jobKind to jobExecId to running repo
type RunningJobs = Record<JobKind, Record<string, RunningRepoJob>>

type RunningRepoJob = {
    jobId: RepoJobId
    jobExecId: string
    lastActivity: Date
    target: ExecRepoJobMessage['target']
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
    #updates: BroadcastChannel = createUpdateChannel()

    get ghToken(): string {
        return this.#ghToken
    }

    constructor(ghToken: string) {
        this.#ghToken = ghToken
        this.#updates.onmessage = this.#onJobUpdate
        this.#refresh()
    }

    exec(channelId: string, jobId: RepoJobId, repo?: RepositoryId) {
        console.log('job exec request')
        this.#createChannel('EXEC', channelId)
        const jobExecId = ulid()
        const target: ExecRepoJobMessage['target'] = repo
            ? { repos: 'single', repo }
            : { repos: 'owner' }
        createRepoJobLog(jobId, jobExecId, target)
            .then(() =>
                this.#launchRepoJob({
                    jobId,
                    jobExecId,
                    target,
                    lastActivity: new Date(),
                }),
            )
            .catch((e: unknown) => {
                console.error('JobSWorkerBackend error initializing exec', e)
            })
    }

    ls(_channelId: string) {
        throw Error()
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

    #launchRepoJob(job: RunningRepoJob) {
        this.#running.repos[job.jobExecId] = job
        this.#launcher.request(workerLaunchId(job.jobId), {
            kind: 'EXEC',
            ghToken: this.#ghToken,
            jobExecId: job.jobExecId,
            target: job.target,
        } satisfies ExecRepoJobMessage)
    }

    #onJobUpdate = async (e: MessageEvent<unknown>) => {
        if (!isJobWorkerUpdateMessage(e.data)) {
            console.warn(
                'JobsSWorker update channel invalid JobWorkerUpdateMessage',
                e.data,
            )
            return
        }
        switch (e.data.jobKind) {
            case 'repos':
                switch (e.data.kind) {
                    case 'status':
                        await markRepoJobStatus(
                            e.data.jobExecId,
                            e.data.repo,
                            e.data.status,
                        )
                        this.#runningJobActivity('repos', e.data.jobExecId)
                        break
                    case 'complete':
                        await markJobDone(e.data.jobExecId)
                        this.#runningJobComplete('repos', e.data.jobExecId)
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
                this.#launchRepoJob({
                    jobId,
                    jobExecId,
                    target,
                    lastActivity: new Date(),
                })
            }
        } catch (e) {
            console.error('JobsSWorker refresh error', e)
        }
    }

    #runningJobActivity(jobKind: JobKind, jobExecId: string) {
        this.#running[jobKind][jobExecId].lastActivity = new Date()
    }

    #runningJobComplete(jobKind: JobKind, jobExecId: string) {
        console.log(
            'JobsSWorker job',
            this.#running[jobKind][jobExecId].jobId,
            'complete',
        )
        delete this.#running[jobKind][jobExecId]
    }
}
