import {
    createRepoJobRecord,
    markRepoJobTaskCompleted,
    markRepoJobTaskFailed,
} from '@sidelines/data/indexeddb/tx/jobLogging'
import queryViewerOwnedRepoNames from '@sidelines/github/repositories/queryViewerOwnedRepoNames'
import { queryUserLogin } from '@sidelines/github/user/queryUserLogin'
import type { RepositoryId } from '@sidelines/model'
import { isMessageObject } from '../messaging.ts'

declare const self: DedicatedWorkerGlobalScope

const LABEL = self.location.pathname
    .replace(/^\/workers\/jobs\//, '')
    .replace(/\.js$/, '')

export type JobDefinition = {
    forEachViewerOwnedRepo: (
        ghToken: string,
        repo: RepositoryId,
    ) => Promise<void>
}

export type ExecJobWorkerRequest = {
    kind: 'EXEC'
    ghToken: string
    jobExecId: string
}

function isExecJobWorkerMessage(data: unknown): data is ExecJobWorkerRequest {
    if (!isMessageObject(data)) {
        return false
    }
    switch (data.kind) {
        case 'EXEC':
            return true
        default:
            console.warn(
                'ExecJobWorker isExecJobWorkerMessage invalid',
                data.kind,
            )
            return false
    }
}

export class ExecJobWorker {
    #definition: JobDefinition

    constructor(definition: JobDefinition) {
        this.#definition = definition
    }

    onmessage = (e: MessageEvent<unknown>) => {
        if (!isExecJobWorkerMessage(e.data)) {
            throw Error()
        }
        switch (e.data.kind) {
            case 'EXEC':
                this.#execute(e.data.ghToken, e.data.jobExecId)
                break
            default:
                throw Error()
        }
    }

    async #execute(ghToken: string, jobExecId: string) {
        console.log('ExecJobWorker', LABEL, 'executing', jobExecId)
        try {
            const fetchingViewerRepoNames = queryViewerOwnedRepoNames(ghToken)
            await createRepoJobRecord(jobExecId)
            const owner = await queryUserLogin(ghToken)
            const viewerRepoNames = await fetchingViewerRepoNames
            const repoIds = viewerRepoNames.map(name => ({ owner, name }))
            for (const repoId of repoIds) {
                await this.#definition.forEachViewerOwnedRepo(ghToken, repoId)
                await markRepoJobTaskCompleted(jobExecId, repoId)
            }
        } catch (e) {
            console.error('ExecJobWorker', LABEL, 'error', e)
            await markRepoJobTaskFailed()
        }
    }
}
