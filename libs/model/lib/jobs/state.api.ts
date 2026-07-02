import type { RepoNameWithOwner } from '../repo.ts'
import type { JobKind } from './kind.api.ts'
import type {
    RepoJobExecResult,
    SyncedRefsJobExecResult,
} from './result.api.ts'
import type { RepoJobTarget, SyncedRefsData } from './spec.api.ts'

export type JobExecState<JK extends JobKind = JobKind> = JK extends JobKind
    ? { jobKind: JK } & JobExecStates[JK]
    : never

type JobExecStates = {
    repos: {
        repos: Record<RepoNameWithOwner, RepoJobExecResult>
        target: RepoJobTarget
        whenLastActivity: Date | null
    }
    scheduled: {}
    syncedRefs: {
        repos: Record<RepoNameWithOwner, SyncedRefsExecState>
        whenLastActivity: Date | null
    }
}

export type SyncedRefsExecState = {
    synced: SyncedRefsData
    result: SyncedRefsJobExecResult | null
}
