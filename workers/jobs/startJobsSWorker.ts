import type { JobSchedulingRequest } from './jobApiMessaging.ts'

export default function startJobSchedulingWorker(
    ghToken: string,
): SharedWorker {
    const sw = new SharedWorker('./JobsSWorker.ts', {
        name: 'Sidelines.dev - job scheduling',
    })
    sw.onerror = onError
    sw.port.onmessage = onMessage
    sw.port.onmessageerror = onMessageError
    sw.port.postMessage({
        kind: 'INIT',
        ghToken,
    } satisfies JobSchedulingRequest)
    return sw
}

function onError(e: ErrorEvent) {
    console.error('SharedWorker(JobsSWorker).onerror', e)
}

function onMessage(e: MessageEvent<any>) {
    console.log('SharedWorker(JobsSWorker).onmessage', e.data)
}

function onMessageError(e: MessageEvent<any>) {
    console.error('SharedWorker(JobsSWorker).onmessageerror', e.data)
}
