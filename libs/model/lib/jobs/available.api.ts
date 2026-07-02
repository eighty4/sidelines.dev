import type { JobIdForJobKind } from './id.api.ts'
import type { JobKind } from './kind.api.ts'

// Dyanmic API for requesting available jobs from jobs backend
//
// `syncedRefs` jobs use SidelinesJobDataCN to retrieve AvailableJobs<'syncedRefs'>
// Pages use JobApiClient to retrieve jobs to execute

// JobKind excluding `scheduled`
export type JobKindForAvailableJobs<JK extends JobKind = JobKind> =
    JK extends 'scheduled' ? never : JK

export type AvailableJob<JK extends JobKindForAvailableJobs> = {
    jobId: JobIdForJobKind<JK>
    critiera?: Partial<Record<AvailableJobCriterion, boolean>>
}

export const AvailableJobCriteria = ['watch'] as const

export type AvailableJobCriterion = (typeof AvailableJobCriteria)[number]

export type AvailableJobsReq<JK extends JobKindForAvailableJobs> = {
    jobKind: JK
}

export type AvailableJobsRes<JK extends JobKindForAvailableJobs> = {
    jobs: Array<AvailableJob<JK>>
}
