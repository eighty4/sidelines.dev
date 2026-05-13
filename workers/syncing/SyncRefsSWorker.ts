import { getReposWithWatches } from '@sidelines/data/indexeddb/tx/readWatches'
import {
    getTimeSinceLastSync,
    syncRefs,
} from '@sidelines/data/indexeddb/tx/syncRefs'
import { queryMultipleRepoHeadOids } from '@sidelines/github/repositories/queryMultipleRepoHeadOids'
import { isMessageObject } from '../messaging.ts'
import { SharedWorkerSideWorkerLauncher } from '../WorkerLaunch.ts'
import type { SyncRefsEvent } from './syncMessaging.ts'

declare let self: SharedWorkerGlobalScope

export type SyncRefsInit = {
    kind: 'init'
    ghToken: string
}

function isSyncRefsInit(data: unknown): data is SyncRefsInit {
    if (!isMessageObject(data)) {
        return false
    }
    return (
        data.kind === 'init' &&
        'ghToken' in data &&
        typeof data.ghToken === 'string'
    )
}

let workerLaunch: SharedWorkerSideWorkerLauncher | null = null
let ports: Array<MessagePort> = []
let ghToken: string | null = null
let syncTimeout: number

// todo announce with port.postMessage detailing close cause
function closeAll() {
    if (syncTimeout) clearTimeout(syncTimeout)
    for (const port of ports) {
        port.onmessage = null
        port.close()
    }
}

self.onconnect = (e: MessageEvent) => {
    for (const port of e.ports) port.onmessage = onMessage
}

function onMessage(e: MessageEvent<unknown>) {
    if (!isSyncRefsInit(e.data)) {
        throw Error()
    }
    console.log('SyncRefsSWorker initializing')
    if (workerLaunch === null) {
        workerLaunch = new SharedWorkerSideWorkerLauncher()
    }
    if (ghToken !== null && ghToken !== e.data.ghToken) {
        console.warn('SyncRefsSWorker new auth, closing previous ports')
        closeAll()
        ports = []
    }
    ghToken = e.data.ghToken
    ports.push(e.ports[0])
    if (!syncTimeout) {
        initSyncRefs().then().catch(console.error)
    }
}

const SYNC_INIT = 2 * 60 * 1000
const SYNC_INTERVAL = 5 * 60 * 1000

async function initSyncRefs() {
    const timeElapsed: number | null = await getTimeSinceLastSync()
    if (timeElapsed === null || timeElapsed > SYNC_INIT) {
        await sync()
    } else {
        scheduleSync(SYNC_INIT - timeElapsed)
    }
}

async function sync() {
    if (ghToken === null) {
        console.error('unauthorized sync attempted')
        return
    }
    console.log('SYNC')
    const watchedRepos = await getReposWithWatches()
    const headRefs = await queryMultipleRepoHeadOids(ghToken, watchedRepos)
    console.log('syncing', headRefs.length, 'repos')
    const syncedRefs = await syncRefs(headRefs)
    console.log('updated', syncedRefs.length, 'repos')
    for (const workerId of [
        'SYNC_packages',
        'SYNC_watches',
    ] satisfies Array<`SYNC_${string}`>) {
        workerLaunch!.request(workerId, {
            kind: 'sync',
            ghToken,
            syncedRefs,
        } satisfies SyncRefsEvent)
    }
    // todo retrieve uncompleted sync tasks to retry
    scheduleSync()
}

// todo fix needing self.setTimeout bc of node type conflict
function scheduleSync(timeout: number = SYNC_INTERVAL) {
    console.log('syncing in', timeout)
    syncTimeout = self.setTimeout(sync, timeout)
}
