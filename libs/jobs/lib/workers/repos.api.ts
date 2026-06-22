import {
    splitRepoName,
    type RepoJobExecStatus,
    type RepoNameWithOwner,
    type RepositoryId,
} from '@sidelines/model'
import { isError } from '@sidelines/model/errors'
import { createJobUpdateChannel } from '../messaging/channel.ts'
import {
    isExecRepoJobMessage,
    type ExecRepoJobMessage,
} from '../messaging/exec.ts'
import type { JobWorkerUpdateMessage } from '../messaging/update.ts'

declare const self: DedicatedWorkerGlobalScope

const LABEL = self.location.pathname
    .replace(/^\/workers\/jobs\//, '')
    .replace(/\.js$/, '')

const updateChannel = createJobUpdateChannel()

function postUpdate(update: JobWorkerUpdateMessage) {
    updateChannel.postMessage(update)
}

export type RepoJobExec = {
    forRepo(
        ghToken: string,
        repo: RepositoryId,
    ): Promise<RepoJobExecStatus | undefined | void>
}

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

async function onExecRepoJob(
    { ghToken, jobExecId, repos }: ExecRepoJobMessage,
    exec: RepoJobExec,
) {
    console.log(LABEL, 'repo job starting on', repos.length, 'repos')
    postUpdate({
        kind: 'starting',
        jobKind: 'repos',
        jobExecId,
    })
    for (const repo of repos) {
        await execJobForRepo(ghToken, jobExecId, repo, exec)
    }
    console.log(LABEL, 'repo job finished')
    postUpdate({
        jobExecId,
        jobKind: 'repos',
        kind: 'complete',
    })
}

async function execJobForRepo(
    ghToken: string,
    jobExecId: string,
    repo: RepoNameWithOwner,
    exec: RepoJobExec,
) {
    const status = await execJobForRepoJobStatus(
        ghToken,
        splitRepoName(repo),
        exec,
    )
    postUpdate({
        kind: 'status',
        jobKind: 'repos',
        jobExecId,
        repo,
        status,
    })
}

async function execJobForRepoJobStatus(
    ghToken: string,
    repo: RepositoryId,
    exec: RepoJobExec,
): Promise<RepoJobExecStatus> {
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
