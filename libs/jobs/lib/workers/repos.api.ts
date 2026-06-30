import {
    splitRepoName,
    type RepoJobExecResult,
    type RepositoryId,
} from '@sidelines/model'
import { isError } from '@sidelines/model/errors'
import { isExecRepoJobMessage } from '../messaging/exec.ts'
import {
    createJobUpdateChannel,
    type ExecRepoJobMessage,
    type RepoJobWorkerUpdate,
} from '../messaging.api.ts'
import { workerLabel } from './location.ts'

export type RepoJobExec = {
    forRepo(
        ghToken: string,
        repo: RepositoryId,
    ): Promise<RepoJobExecResult | undefined | void>
}

declare const self: DedicatedWorkerGlobalScope

const LABEL = workerLabel()

export function registerRepoJob(exec: RepoJobExec): void {
    self.onmessage = async (e: MessageEvent<unknown>) => {
        if (!isExecRepoJobMessage(e.data)) {
            console.error(LABEL, 'invalid ExecRepoJobMessage')
            self.close()
        } else {
            await onExecRepoJob(e.data, exec)
        }
        // todo make this WorkerLaunch detail less like magic fudge
        postMessage({ kind: 'finished' })
    }
}

const postUpdate = (c: BroadcastChannel, update: RepoJobWorkerUpdate) =>
    c.postMessage(update)

async function onExecRepoJob(
    { ghToken, jobId, jobExecId, repos }: ExecRepoJobMessage,
    exec: RepoJobExec,
) {
    const c = createJobUpdateChannel()
    console.log(LABEL, 'repo job starting on', repos.length, 'repos')
    postUpdate(c, {
        kind: 'starting',
        jobKind: 'repos',
        jobId,
        jobExecId,
    })
    for (const repo of repos) {
        const status = await execJobForRepoJobStatus(
            ghToken,
            splitRepoName(repo),
            exec,
        )
        postUpdate(c, {
            kind: 'status',
            jobKind: 'repos',
            jobId,
            jobExecId,
            repo,
            status,
        })
    }
    console.log(LABEL, 'repo job finished')
    postUpdate(c, {
        jobExecId,
        jobId,
        jobKind: 'repos',
        kind: 'complete',
    })
    c.close()
}

async function execJobForRepoJobStatus(
    ghToken: string,
    repo: RepositoryId,
    exec: RepoJobExec,
): Promise<RepoJobExecResult> {
    try {
        return (
            (await exec.forRepo(ghToken, repo)) ?? {
                state: 'done',
                when: new Date(),
            }
        )
    } catch (e: unknown) {
        console.error(LABEL, 'repo job error on', repo, e)
        if (isError(e)) {
            return {
                state: 'exception',
                when: new Date(),
                error: e.name,
                message: e.message,
                stack: e.stack,
            }
        } else {
            return {
                state: 'exception',
                when: new Date(),
                error: JSON.stringify(e),
            }
        }
    }
}
