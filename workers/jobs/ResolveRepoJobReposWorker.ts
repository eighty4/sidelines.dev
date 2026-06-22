import queryViewerOwnedRepoNames from '@sidelines/github/repositories/queryViewerOwnedRepoNames'
import type { RepoNameWithOwner } from '@sidelines/model'
import {
    makePostAndCloseChannel,
    type SidelinesJobDataCN,
} from '@sidelines/model/channels'
import type { LaunchedWorkerMessage } from '../WorkerLaunch.ts'

declare const self: DedicatedWorkerGlobalScope

export type ResolveRepoJobReposWorkerInit = {
    ghToken: string
    channel: SidelinesJobDataCN
}

export type ResolveRepoJobReposWorkerResult = {
    repos: Array<RepoNameWithOwner>
}

self.onmessage = async (e: MessageEvent<ResolveRepoJobReposWorkerInit>) => {
    const repos = await queryViewerOwnedRepoNames(e.data.ghToken)
    makePostAndCloseChannel(e.data.channel, {
        repos,
    } satisfies ResolveRepoJobReposWorkerResult)
    postMessage({ kind: 'finished' } satisfies LaunchedWorkerMessage)
}
