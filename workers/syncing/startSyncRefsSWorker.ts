export default function startSyncRefsWorker(ghToken: string) {
    const w = new SharedWorker('./SyncRefsSWorker.ts', {
        name: 'Sidelines.dev - ref syncing',
    })

    w.port.postMessage({
        kind: 'init',
        ghToken,
    })
    w.onerror = (e: any) =>
        console.log('SyncRefsClient sharedWorker onerror', e)
    w.port.onmessage = (e: MessageEvent<unknown>) =>
        console.log('SyncRefsClient sharedWorker onmessage', e.data)
    w.port.onmessageerror = (e: any) =>
        console.log('SyncRefsClient sharedWorker onmessageerror', e)
}
