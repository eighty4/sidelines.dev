import type { SyncRefsInit } from './syncMessaging.ts'

declare const self: DedicatedWorkerGlobalScope

onmessage = (_e: MessageEvent<SyncRefsInit>) => {
    syncWatches()
        .then(() => {})
        .catch(e => {
            console.error('syncPackages.js error', e)
        })
}

onmessageerror = (e: MessageEvent) => {
    console.error('syncPackages.js messageerror', e.data)
}

async function syncWatches(): Promise<void> {
    console.log('syncWatches')
}
