export default function startJobSchedulingWorker(
    ghToken: string,
): SharedWorker {
    const sw = new SharedWorker('./JobsSWorker.ts', {
        name: 'Sidelines.dev job scheduling',
    })
    sw.onerror = onError
    sw.port.onmessage = onMessage
    sw.port.onmessageerror = onMessageError
    sw.port.postMessage({ kind: 'INIT', ghToken })
    return sw
}

function onError(e: ErrorEvent) {
    console.error('SharedWorker(jobScheduling.ts).onerror', e)
}

function onMessage(e: MessageEvent<any>) {
    console.log('SharedWorker(jobScheduling.ts).onmessage', e.data)
}

function onMessageError(e: MessageEvent<any>) {
    console.error('SharedWorker(jobScheduling.ts).onmessageerror', e.data)
}
