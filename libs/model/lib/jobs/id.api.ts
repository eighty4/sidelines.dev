import type { JobKind } from './kind.api.ts'

export type JobId = `JOB_${JobKind}_${string}`

export type RepoJobId = JobIdFormat<`JOB_repos_${string}`>

export type ScheduledJobId = JobIdFormat<`JOB_scheduled_${string}`>

export type SyncedRefsJobId = JobIdFormat<`JOB_syncedRefs_${string}`>

type JobIdFormat<T extends string> = T extends JobId ? T : never

export type JobIdForJobKind<JK extends JobKind> = JK extends 'repos'
    ? RepoJobId
    : JK extends 'scheduled'
      ? ScheduledJobId
      : SyncedRefsJobId
