import {
    isMessageObject,
    isOptionalRepoId,
    isString,
} from '@sidelines/model/validate'
import type { JobApiRequest, JobSchedulingRequest } from './jobApiMessaging.ts'
import JobsBackend from './JobsSWorkerBackend.ts'

declare const self: SharedWorkerGlobalScope

let backend: JobsBackend | null = null

self.onconnect = (e: MessageEvent<unknown>) => {
    for (const port of e.ports) port.onmessage = onMessage
}

async function onMessage(e: MessageEvent<unknown>) {
    if (e.data === null || typeof e.data !== 'object') {
        return
    }
    let processing: Promise<void>
    if (isJobSchedulingRequest(e.data)) {
        processing = onJobSchedulingRequest(e.data)
    } else if (isJobExecRequest(e.data)) {
        processing = onJobExecRequest(e.data)
    } else {
        return
    }

    try {
        await processing
    } catch (e) {
        console.error(e)
    }
}

function isJobSchedulingRequest(req: Object): req is JobSchedulingRequest {
    if (!isMessageObject(req)) return false
    switch (req.kind) {
        case 'INIT':
            return isString(req.ghToken)
    }
    return false
}

async function onJobSchedulingRequest(request: JobSchedulingRequest) {
    if (backend === null && request.kind !== 'INIT') {
        console.error('bad init')
    } else if (request.kind === 'INIT') {
        if (backend === null) {
            backend = new JobsBackend(request.ghToken)
        } else if (backend.hasGhTokenChanged(request.ghToken)) {
            backend.shutdown()
            backend = null
            console.warn('new auth, closing ports')
        }
    }
}

function isJobExecRequest(req: unknown): req is JobApiRequest {
    if (!isMessageObject(req)) return false
    switch (req.kind) {
        case 'LS':
            return isString(req.channelId)
        case 'EXEC':
            return (
                isString(req.channelId) &&
                isString(req.jobId) &&
                isOptionalRepoId(req.repo)
            )
    }
    return false
}

async function onJobExecRequest(request: JobApiRequest) {
    if (backend === null) {
        throw Error()
    }
    switch (request.kind) {
        case 'EXEC':
            backend.exec(request.channelId, request.jobId, request.repo)
            break
        case 'LS':
            backend.ls(request.channelId)
            break
    }
}
