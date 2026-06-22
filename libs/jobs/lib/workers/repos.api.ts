import { readRepoJobReposCompleted } from '@sidelines/data/tx/jobLog'
import queryViewerOwnedRepoNames from '@sidelines/github/repositories/queryViewerOwnedRepoNames'
import { queryUserLogin } from '@sidelines/github/user/queryUserLogin'
import type { RepoJobExecStatus, RepositoryId } from '@sidelines/model'
import { isError } from '@sidelines/model/errors'
import { createJobUpdateChannel } from '../messaging/channel.ts'
import { isExecRepoJobMessage } from '../messaging/exec.ts'
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
        } else {
            console.log(LABEL, 'repo job starting', e.data.target)
            const { ghToken, jobExecId } = e.data
            switch (e.data.target.repos) {
                case 'single':
                    await execJobForRepo(
                        ghToken,
                        jobExecId,
                        e.data.target.repo,
                        exec,
                    )
                    break
                case 'owner':
                    const repos = await resolveJobRepos(ghToken, jobExecId)
                    await execJobForRepos(ghToken, jobExecId, repos, exec)
                    break
            }
            console.log(LABEL, 'repo job finished')
            postUpdate({
                jobExecId: e.data.jobExecId,
                jobKind: 'repos',
                kind: 'complete',
            })

            // todo make this WorkerLaunch detail less like magic fudge
            postMessage({ kind: 'finished' })
        }
    }
}

// todo use Promise.race to do concurrent batches
async function execJobForRepos(
    ghToken: string,
    jobExecId: string,
    repos: Array<RepositoryId>,
    exec: RepoJobExec,
): Promise<void> {
    for (const repo of repos) {
        await execJobForRepo(ghToken, jobExecId, repo, exec)
    }
}

async function execJobForRepo(
    ghToken: string,
    jobExecId: string,
    repo: RepositoryId,
    exec: RepoJobExec,
) {
    const status = await execJobForRepoJobStatus(ghToken, repo, exec)
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

async function resolveJobRepos(
    ghToken: string,
    jobExecId: string,
): Promise<Array<RepositoryId>> {
    // todo one network request
    const fetchingViewerRepoNames = queryViewerOwnedRepoNames(ghToken)
    const readingCompletedRepos = readRepoJobReposCompleted(jobExecId)
    const owner = await queryUserLogin(ghToken)
    const viewerRepoNames = await fetchingViewerRepoNames
    const completed: Set<string> = new Set(
        (await readingCompletedRepos).map(repo => `${repo.owner}/${repo.name}`),
    )
    console.log(
        LABEL,
        'resolveJobRepos:',
        viewerRepoNames.length,
        'total',
        completed.size,
        'previously complted',
    )
    return viewerRepoNames
        .filter(repo => !completed.has(`${owner}/${repo}`))
        .map(name => ({ owner, name }))
}
