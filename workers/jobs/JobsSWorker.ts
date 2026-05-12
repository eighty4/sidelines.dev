import type { JobApiRequest, JobSchedulingRequest } from './jobMessaging.ts'
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

function isJobSchedulingRequest(
    request: Object,
): request is JobSchedulingRequest {
    if ('kind' in request) {
        switch (request.kind) {
            case 'INIT':
                return true
        }
    }
    return false
}

async function onJobSchedulingRequest(request: JobSchedulingRequest) {
    if (backend === null && request.kind !== 'INIT') {
        console.error('bad init')
    } else if (request.kind === 'INIT') {
        if (backend === null) {
            backend = new JobsBackend(request.ghToken)
            refreshStartedJobs()
        } else if (backend.ghTokenChanged(request.ghToken)) {
            backend.shutdown()
            backend = null
            console.warn('new auth, closing ports')
        }
    }
}

function isJobExecRequest(request: Object): request is JobApiRequest {
    if ('kind' in request) {
        switch (request.kind) {
            case 'LS':
            case 'EXEC':
                return true
        }
    }
    return false
}

async function onJobExecRequest(request: JobApiRequest) {
    if (backend === null) {
        throw Error()
    }
    switch (request.kind) {
        case 'EXEC':
            backend.exec(request.channelId)
            break
        case 'LS':
            backend.ls(request.channelId)
            break
    }
}

function refreshStartedJobs() {}
