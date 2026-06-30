import type {
    BranchRef,
    RepoNameWithOwner,
    SyncedRefsData,
    SyncedRefsJobExecResult,
} from '@sidelines/model'
import { isError } from '@sidelines/model/errors'
import {
    isExecSyncedRefsJobMessage,
    type ExecSyncedRefsJobMessage,
} from '../messaging/exec.ts'
import type { SyncedRefsJobWorkerUpdate } from '../messaging/update.ts'
import { createJobUpdateChannel } from '../messaging.api.ts'
import { workerLabel } from './location.ts'

export type SyncedRefsJobInput = {
    repo: RepoNameWithOwner
    from?: BranchRef
    to: BranchRef
}

export type SyncedRefsJobExec = {
    forSyncedRefs(
        ghToken: string,
        syncedRefs: SyncedRefsJobInput,
    ): Promise<SyncedRefsJobExecResult | undefined | void>
}

declare const self: DedicatedWorkerGlobalScope

const LABEL = workerLabel()

export function registerSyncedRefJob(exec: SyncedRefsJobExec): void {
    self.onmessage = async (e: MessageEvent<unknown>) => {
        if (!isExecSyncedRefsJobMessage(e.data)) {
            console.error(LABEL, 'invalid ExecRepoJobMessage')
            self.close()
        } else {
            await onExecSyncedRefsJob(e.data, exec)
        }
        // todo make this WorkerLaunch detail less like magic fudge
        postMessage({ kind: 'finished' })
    }
}

const postUpdate = (c: BroadcastChannel, update: SyncedRefsJobWorkerUpdate) =>
    c.postMessage(update)

async function onExecSyncedRefsJob(
    { ghToken, jobId, jobExecId, repos }: ExecSyncedRefsJobMessage,
    exec: SyncedRefsJobExec,
) {
    const c = createJobUpdateChannel()
    console.log(
        LABEL,
        'syncedRefs job starting on',
        Object.keys(repos).length,
        'repos',
    )
    postUpdate(c, {
        jobId,
        jobExecId,
        jobKind: 'syncedRefs',
        kind: 'starting',
    })
    for (const syncedRefs of mapStateToInput(repos)) {
        const status = await execJobForSyncedRefsJobStatus(
            ghToken,
            syncedRefs,
            exec,
        )
        postUpdate(c, {
            jobId,
            kind: 'status',
            jobKind: 'syncedRefs',
            jobExecId,
            repo: syncedRefs.repo,
            status,
        })
    }
    postUpdate(c, {
        jobId,
        jobExecId,
        jobKind: 'syncedRefs',
        kind: 'complete',
    })
}

function mapStateToInput(
    state: Record<RepoNameWithOwner, SyncedRefsData>,
): Array<SyncedRefsJobInput> {
    return Object.entries(state).map(([repo, syncedRefs]) => ({
        repo: repo as RepoNameWithOwner,
        to: syncedRefs.to,
        from: syncedRefs.from,
    }))
}

async function execJobForSyncedRefsJobStatus(
    ghToken: string,
    syncedRefs: SyncedRefsJobInput,
    exec: SyncedRefsJobExec,
): Promise<SyncedRefsJobExecResult> {
    try {
        return (
            (await exec.forSyncedRefs(ghToken, syncedRefs)) ?? {
                state: 'done',
                when: new Date(),
            }
        )
    } catch (e: unknown) {
        console.error(LABEL, 'syncedRefs job error on', syncedRefs.repo, e)
        const when = new Date()
        if (isError(e)) {
            return {
                state: 'exception',
                when,
                error: e.name,
                message: e.message,
                stack: e.stack,
            }
        } else {
            return {
                state: 'exception',
                when,
                error: JSON.stringify(e),
            }
        }
    }
}
