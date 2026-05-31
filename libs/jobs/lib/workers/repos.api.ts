import queryViewerOwnedRepoNames from '@sidelines/github/repositories/queryViewerOwnedRepoNames'
import { queryUserLogin } from '@sidelines/github/user/queryUserLogin'
import type { RepoJobExecStatus, RepositoryId } from '@sidelines/model'
import { createJobUpdateChannel } from '../messaging/channel.ts'
import { isExecRepoJobMessage } from '../messaging/exec.ts'
import type { JobWorkerUpdateMessage } from '../messaging/update.ts'

declare const self: DedicatedWorkerGlobalScope

// const LABEL = self.location.pathname
//     .replace(/^\/workers\/jobs\//, '')
//     .replace(/\.js$/, '')

let updateChannel: BroadcastChannel

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
        if (isExecRepoJobMessage(e.data)) {
            await execJob(e.data.ghToken, e.data.jobExecId, exec)
            postUpdate({
                jobExecId: e.data.jobExecId,
                jobKind: 'repo',
                kind: 'complete',
            })
        }
    }
}

// todo use Promise.race to do concurrent batches
async function execJob(
    ghToken: string,
    jobExecId: string,
    exec: RepoJobExec,
): Promise<void> {
    const repos = await resolveJobRepos(ghToken, jobExecId)
    updateChannel = createJobUpdateChannel()
    for (const repo of repos) {
        const status = await execJobForRepo(ghToken, repo, exec)
        postUpdate({
            kind: 'status',
            jobKind: 'repo',
            jobExecId,
            repo,
            status,
        })
    }
}

async function execJobForRepo(
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
    } catch (e: any) {
        return {
            state: 'error',
            when: new Date(),
            error: e.message,
            stack: e.stack,
        }
    }
}

// todo read job data from indexeddb to determine which repos to filter out
async function resolveJobRepos(
    ghToken: string,
    _jobExecId: string,
): Promise<Array<RepositoryId>> {
    // todo one network request
    const fetchingViewerRepoNames = queryViewerOwnedRepoNames(ghToken)
    const owner = await queryUserLogin(ghToken)
    const viewerRepoNames = await fetchingViewerRepoNames
    return viewerRepoNames.map(name => ({ owner, name }))
}
