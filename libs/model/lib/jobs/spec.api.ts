import type { BranchRef, RepoNameWithOwner, RepositoryId } from '../repo.ts'

export type RepoJobExecSpec = {
    target: RepoJobTarget
}

export type RepoJobTarget =
    | {
          repos: 'single'
          repo: RepositoryId
      }
    | {
          repos: 'owner'
      }

export type SyncedRefsJobExecSpec = {
    repos: Record<RepoNameWithOwner, SyncedRefsData>
}

export type SyncedRefsData = {
    to: BranchRef
    from: BranchRef | null
}
