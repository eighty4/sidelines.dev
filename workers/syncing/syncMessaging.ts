import type { BranchRef, RepositoryId } from '@sidelines/model'

// from syncRefs SharedWorker to SyncRefsClient
export type SyncRefsEvent = {
    kind: 'sync'
    ghToken: string
    syncedRefs: Array<RepoSyncRef>
}

export type RepoSyncRef = {
    repo: RepositoryId
    defaultBranch: BranchRef
    from?: string
    to: string
}
