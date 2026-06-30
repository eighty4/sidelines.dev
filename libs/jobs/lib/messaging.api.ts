import { makeChannel } from '@sidelines/model/channels'

export type {
    ExecRepoJobMessage,
    ExecSyncedRefsJobMessage,
    ExecScheduledJobMessage,
} from './messaging/exec.ts'

export type {
    JobWorkerUpdate,
    JobWorkerUpdateStarting,
    JobWorkerUpdateComplete,
    RepoJobWorkerUpdate,
    RepoJobWorkerUpdateStatus,
    ScheduledJobWorkerUpdate,
    SyncedRefsJobWorkerUpdate,
} from './messaging/update.ts'

export { isJobWorkerUpdate } from './messaging/update.ts'

export function createJobUpdateChannel() {
    return makeChannel('sl.job.worker.update')
}
