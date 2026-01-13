import type { RepoSyncRef, SyncRefsInit } from './syncMessaging.ts'
import { findRepoPackages } from '@sidelines/packages/findRepoPackages'

declare const self: DedicatedWorkerGlobalScope

onmessage = (e: MessageEvent<SyncRefsInit>) => {
    syncPackages(e.data.ghToken, e.data.repos)
        .then(() => {})
        .catch(e => {
            console.error('syncPackages.js error', e)
        })
}

onmessageerror = (e: MessageEvent) => {
    console.error('syncPackages.js messageerror', e.data)
}

async function syncPackages(
    ghToken: string,
    refs: Array<RepoSyncRef>,
): Promise<void> {
    for (const ref of refs) {
        await findRepoPackages(ghToken, ref.repo, ref.defaultBranch)
    }
    console.log('syncPackages', refs)
}
