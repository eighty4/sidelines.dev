import type { RepoHeadRef } from '@sidelines/model'

// broadcast from SharedWorker(syncRefs) to SyncRefsClient
export type SyncExecReq = {
    kind: 'request'
}

// broadcast from SyncRefsClient to SharedWorker(syncRefs)
export type SyncExecAvailable = {
    kind: 'available'
    pageId: string
}

// port message from SharedWorker(syncRefs) to SyncRefsClient
export type SyncExecJob =
    | {
          kind: 'packages'
          detail: SyncPackagesInit
      }
    | {
          kind: 'watches'
          detail: SyncWatchesInit
      }

export type SyncPackagesInit = {
    repos: Array<RepoHeadRef>
}

export type SyncWatchesInit = {}

// port message from Worker(syncPackages | syncWatches) to SyncRefsClient
export type SyncExecUpdate =
    | {
          kind: 'done'
      }
    | {
          kind: 'error'
      }

const SYNC_CHANNEL = 'sidelines.sync'

export function createChannel(): BroadcastChannel {
    return new BroadcastChannel(SYNC_CHANNEL)
}
