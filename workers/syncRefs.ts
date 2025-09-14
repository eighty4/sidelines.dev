import {
    getReposWithWatches,
    getTimeSinceLastSync,
    syncRefs,
} from '@sidelines/data/indexeddb'
import { collectRepoHeadOids } from '@sidelines/github'
import type { RepositoryId } from '@sidelines/model'

declare let self: SharedWorkerGlobalScope

export type SyncRefsReq =
    | {
          kind: 'init'
          ghToken: string
      }
    | {
          kind: 'update'
          repo: RepositoryId
      }

const ports: Array<MessagePort> = []
let ghToken: string | null = null
let syncTimeout: number

// todo announce with port.postMessage detailing close cause
function closeAll(toClose?: Iterable<MessagePort>) {
    if (syncTimeout) clearTimeout(syncTimeout)
    for (const port of toClose || ports) port.close()
    ports.length = 0
}

self.onconnect = (e: MessageEvent<SyncRefsReq>) => {
    for (const port of e.ports) port.onmessage = onMessage
}

function onMessage(e: MessageEvent<SyncRefsReq>) {
    if (ghToken === null && e.data.kind !== 'init') {
        console.error('bad init')
        closeAll(e.ports)
    }
    switch (e.data.kind) {
        case 'init':
            console.log('init')
            if (ghToken !== null && ghToken !== e.data.ghToken) {
                console.warn('new auth, closing ports')
                closeAll()
            }
            ghToken = e.data.ghToken
            ports.push(...e.ports)
            initSyncRefs().then().catch(console.error)
            break
        case 'update':
            console.log('update')
            // todo
            console.log('todo')
            break
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
    if (watchedRepos.length) {
        const headRefs = await collectRepoHeadOids(ghToken, watchedRepos)
        console.log('syncing', headRefs.length, 'repos')
        const syncUpdates = await syncRefs(headRefs)
        console.log('updated', syncUpdates.length, 'repos')
        // todo distribute sync tasks to dedicated workers
        // todo retrieve uncompleted sync tasks to retry
        // todo listen on broadcast channel for completed tasks
    }
    scheduleSync()
}

// todo fix needing self.setTimeout bc of node type conflict
function scheduleSync(timeout: number = SYNC_INTERVAL) {
    console.log('syncing in', timeout)
    syncTimeout = self.setTimeout(sync, timeout)
}
