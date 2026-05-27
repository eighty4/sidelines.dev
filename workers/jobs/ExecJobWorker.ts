import { markJobDone, markRepoJobStatus } from '@sidelines/data/tx/jobLog'
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
        const repoIds = await this.#fetchViewerRepos(ghToken)

        for (const repoId of repoIds) {
            try {
                await this.#definition.forEachViewerOwnedRepo(ghToken, repoId)
                await markRepoJobStatus(jobExecId, repoId, {
                    state: 'done',
                    when: new Date(),
                })
            } catch (e: any) {
                await markRepoJobStatus(jobExecId, repoId, {
                    state: 'error',
                    when: new Date(),
                    error: e.message,
                    stack: e.stack,
                })
            }
        }

        await markJobDone(jobExecId)
    }

    async #fetchViewerRepos(ghToken: string): Promise<Array<RepositoryId>> {
        const fetchingViewerRepoNames = queryViewerOwnedRepoNames(ghToken)
        const owner = await queryUserLogin(ghToken)
        const viewerRepoNames = await fetchingViewerRepoNames
        return viewerRepoNames.map(name => ({ owner, name }))
    }
}
