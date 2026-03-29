import type { BranchRef, RepositoryId } from '@sidelines/model'

/**
 * BroadcastChannel is used for scheduling a browser tab to host DedicatedWorkers to perform syncing.
 */

const SYNC_CHANNEL = 'sidelines.sync'

export function createChannel(): BroadcastChannel {
    return new BroadcastChannel(SYNC_CHANNEL)
}

// broadcast from SharedWorker to SyncRefsClient
export type SyncExecReq = {
    kind: 'request'
}

// broadcast from SyncRefsClient to syncing SharedWorker
export type SyncExecAvailable = {
    kind: 'available'
    pageId: string
}

/**
 * MessagePort messaging between syncing workers and SyncRefsClient for posting
 * syncing data and announcing completion.
 */

// from syncRefs SharedWorker to SyncRefsClient
export type SyncRefsEvent = {
    kind: 'sync'
    repos: Array<RepoSyncRef>
}

export type RepoSyncRef = { repo: RepositoryId; defaultBranch: BranchRef }

// SyncRefsEvent proxied to syncing DedicatedWorkers
export type SyncRefsInit = SyncRefsEvent & {
    ghToken: string
}

// from a syncing DedicatedWorker to syncRefs SyncRefsClient
export type SyncWorkerEvent = {
    kind: 'done'
}
