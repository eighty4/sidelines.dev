import { findRepoPackages } from '@sidelines/packages/findRepoPackages'
import type { RepoSyncRef, SyncRefsEvent } from './syncMessaging.ts'

declare const self: DedicatedWorkerGlobalScope

onmessage = (e: MessageEvent<SyncRefsEvent>) => {
    syncPackages(e.data.ghToken, e.data.syncedRefs)
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
