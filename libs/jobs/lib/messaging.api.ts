import { makeChannel } from '@sidelines/model/channels'

export type {
    ExecRepoJobMessage,
    ExecSyncedRefsJobMessage,
} from './messaging/exec.ts'

export {
    isJobWorkerUpdateMessage,
    type JobWorkerUpdateMessage,
} from './messaging/update.ts'

export function createJobUpdateChannel() {
    return makeChannel('sl.job.worker.update')
}
