import type { BranchRef, RepositoryId } from '@sidelines/model'

export type SyncedRefs = {
    repo: RepositoryId
    defaultBranch: BranchRef
    from?: string
    to: string
}

export type SyncedRefsJobExec = {
    forSyncedRefs(ghToken: string, syncedRefs: SyncedRefs): Promise<void> | void
}

export function registerSyncedRefJob(_exec: SyncedRefsJobExec): void {}
