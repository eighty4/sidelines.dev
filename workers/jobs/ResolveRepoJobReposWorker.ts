import queryViewerOwnedRepoNames from '@sidelines/github/repositories/queryViewerOwnedRepoNames'
import type { RepoNameWithOwner } from '@sidelines/model'
import type { LaunchedWorkerMessage } from '../WorkerLaunch.ts'

declare const self: DedicatedWorkerGlobalScope

export type ResolveRepoJobReposWorkerInit = {
    ghToken: string
    channel: string
}

export type ResolveRepoJobReposWorkerResult = {
    repos: Array<RepoNameWithOwner>
}

self.onmessage = async (e: MessageEvent<ResolveRepoJobReposWorkerInit>) => {
    const repos = await queryViewerOwnedRepoNames(e.data.ghToken)
    const channel = new BroadcastChannel(e.data.channel)
    channel.postMessage({ repos } satisfies ResolveRepoJobReposWorkerResult)
    channel.close()
    postMessage({ kind: 'finished' } satisfies LaunchedWorkerMessage)
}
