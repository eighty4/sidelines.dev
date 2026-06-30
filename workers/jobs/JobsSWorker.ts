import { connectToDb } from '@sidelines/data/indexeddb'
import {
    isJobApiRequest,
    isJobInitRequest,
    type JobApiRequest,
} from './jobApiMessaging.ts'
import JobsBackend from './JobsBackend.ts'

declare const self: SharedWorkerGlobalScope

let _backend: JobsBackend | Promise<JobsBackend> | null = null

self.onconnect = (e: MessageEvent<unknown>) => {
    for (const port of e.ports) port.onmessage = onMessage
}

function onMessage(e: MessageEvent<unknown>) {
    if (isJobInitRequest(e.data)) {
        initJobsBackend(e.data.ghToken)
    } else if (isJobApiRequest(e.data)) {
        onJobApiRequest(e.data)
    }
}

function initJobsBackend(ghToken: string) {
    if (_backend === null) {
        _backend = connectToDb().then(db => {
            return (_backend = new JobsBackend(db, ghToken))
        })
    } else if (_backend instanceof JobsBackend) {
        verifyGhToken(_backend, ghToken)
    } else {
        _backend.then(backend => verifyGhToken(backend, ghToken))
    }
}

function verifyGhToken(backend: JobsBackend, ghToken: string) {
    if (backend.hasGhTokenChanged(ghToken)) {
        backend.shutdownApiChannels()
        _backend = null
        console.warn('JobsSWorker new auth, closing ports')
    }
}

function onJobApiRequest(request: JobApiRequest) {
    if (_backend === null) {
        console.error(
            'JobsSWorker api request received without JobsBackend initialized',
        )
    } else if (_backend instanceof JobsBackend) {
        dispatchApiRequest(_backend, request)
    } else {
        _backend.then(backend => dispatchApiRequest(backend, request))
    }
}

function dispatchApiRequest(backend: JobsBackend, request: JobApiRequest) {
    switch (request.kind) {
        case 'EXEC':
            backend.exec(request.channelId, request.jobId, request.repo)
            break
        case 'LS':
            backend.ls(request.channelId)
            break
    }
}
