import type { BranchRef, RepositoryId } from '@sidelines/model'

declare const self: DedicatedWorkerGlobalScope

export type SyncedRefs = {
    repo: RepositoryId
    defaultBranch: BranchRef
    from?: string
    to: string
}

export type SyncedRefsJobExec = {
    forSyncedRefs(ghToken: string, syncedRefs: SyncedRefs): Promise<void> | void
}

export function registerSyncedRefJob(_exec: SyncedRefsJobExec): void {
    // todo make this WorkerLaunch detail less like magic fudge
    postMessage({ kind: 'finished' })
}
