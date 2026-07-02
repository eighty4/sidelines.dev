import type { RepoJobId } from './id.api.ts'
import type { RepoJobExecResult } from './result.api.ts'

export type JobUpdate = {
    status: 'running' | 'complete'
}

// JobApiClient.exec() channel reply
export type RepoJobExecUpdate = {
    jobId: RepoJobId
    jobExecId: string
    status: RepoJobExecResult
}
