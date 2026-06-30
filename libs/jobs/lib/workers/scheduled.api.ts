import {
    isExecScheduledJobMessage,
    type ExecScheduledJobMessage,
} from '../messaging/exec.ts'
import {
    createJobUpdateChannel,
    type ScheduledJobWorkerUpdate,
} from '../messaging.api.ts'
import { workerLabel } from './location.ts'

export type ScheduledJobExec = {
    onSchedule(context: ScheduledJobExecContext): Promise<void> | void
}

export type ScheduledJobExecContext = {
    ghToken: string
    jobExecId: string
    lastRun?: Date
}

declare const self: DedicatedWorkerGlobalScope

export function registerScheduledJob(exec: ScheduledJobExec): void {
    self.onmessage = async (e: MessageEvent<unknown>) => {
        if (!isExecScheduledJobMessage(e.data)) {
            console.error(workerLabel(), 'invalid ExecRepoJobMessage')
            self.close()
        } else {
            await onScheduledJobExec(e.data, exec)
        }
        // todo make this WorkerLaunch detail less like magic fudge
        postMessage({ kind: 'finished' })
    }
}

async function onScheduledJobExec(
    { ghToken, jobId, jobExecId }: ExecScheduledJobMessage,
    exec: ScheduledJobExec,
) {
    const c = createJobUpdateChannel()
    c.postMessage({
        jobId,
        jobExecId,
        jobKind: 'scheduled',
        kind: 'starting',
    } satisfies ScheduledJobWorkerUpdate)
    try {
        await exec.onSchedule({ ghToken, jobExecId })
        c.postMessage({
            jobId,
            jobExecId,
            jobKind: 'scheduled',
            kind: 'complete',
        } satisfies ScheduledJobWorkerUpdate)
    } catch (e) {
        console.error(workerLabel(), 'scheduled worker errored', e)
    }
    c.close()
}
