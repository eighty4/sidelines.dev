import type { BranchRef, RepositoryId } from '../repo.ts'
import type { RepoJobId } from './id.api.ts'

export type RepoJobTarget =
    | {
          repos: 'single'
          repo: RepositoryId
      }
    | {
          repos: 'owner'
      }

export type RepoJobSpec = {
    jobId: RepoJobId
    label: string
}

export type SyncedRefsData = {
    to: BranchRef
    from: BranchRef | null
}
