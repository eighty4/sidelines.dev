/// <reference lib="WebWorker" />
import { getTimeSinceLastSync, updateSyncing } from '@sidelines/data'
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

self.onconnect = (e: MessageEvent<SyncRefsReq>) => {
    for (const port of e.ports) port.onmessage = onMessage
}

function onMessage(e: MessageEvent<SyncRefsReq>) {
    if (ghToken === null && e.data.kind !== 'init') {
        console.error('bad init')
        for (const port of e.ports) port.close()
    }
    switch (e.data.kind) {
        case 'init':
            console.log('init')
            if (ghToken !== null && ghToken !== e.data.ghToken) {
                for (const port of e.ports) port.close()
                ports.length = 0
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
        const timeToSync = SYNC_INIT - timeElapsed
        console.log('syncing in', timeToSync)
        setTimeout(sync, timeToSync)
    }
}

async function sync() {
    console.log('SYNC')
    await updateSyncing()
    console.log('syncing in', SYNC_INTERVAL)
    setTimeout(sync, SYNC_INTERVAL)
}
