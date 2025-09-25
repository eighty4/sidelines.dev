import type { RepoHeadRef } from '@sidelines/model'
import type { SyncPackagesInit } from './syncMessaging.ts'

declare const self: DedicatedWorkerGlobalScope

onmessage = (e: MessageEvent<SyncPackagesInit>) => {
    syncPackages(e.data.repos)
        .then(() => {})
        .catch(e => {
            console.error('syncPackages.js error', e)
        })
}

onmessageerror = (e: MessageEvent) => {
    console.error('syncPackages.js messageerror', e.data)
}

async function syncPackages(repos: Array<RepoHeadRef>): Promise<void> {
    console.log('syncPackages', repos)
}
