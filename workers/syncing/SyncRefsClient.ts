import { SyncIndicator } from './SyncIndicator.ts'
import {
    createChannel,
    type SyncExecAvailable,
    type SyncExecReq,
    type SyncExecUpdate,
    type SyncExecJob,
} from './syncMessaging.ts'

export class SyncRefsClient {
    #broadcast: BroadcastChannel = createChannel()
    #pageId: string = crypto.randomUUID()
    #syncIndicator: SyncIndicator = new SyncIndicator()
    #syncing: Array<SyncExecTask> = []
    #w: SharedWorker = new SharedWorker(sidelines.worker.SYNC_REFS, {
        name: 'sidelines.dev syncing',
    })

    constructor(ghToken: string) {
        this.#w.port.postMessage({
            kind: 'init',
            ghToken,
            pageId: this.#pageId,
        })
        this.#w.port.onmessage = this.#onSharedWorkerMessage
        this.#broadcast.onmessage = this.#onBroadcastMessage
    }

    // negoatiate worker distribution over broadcast channel
    #onBroadcastMessage = (e: MessageEvent<SyncExecReq>) => {
        if (e.data.kind === 'request') {
            const reply: SyncExecAvailable = {
                kind: 'available',
                pageId: this.#pageId,
            }
            this.#broadcast.postMessage(reply)
        } else {
            console.error('?', JSON.stringify(e.data))
        }
    }

    // launch dedicated worker
    #onSharedWorkerMessage = (e: MessageEvent<SyncExecJob>) => {
        const syncTask = new SyncExecTask(e.data.kind)
        syncTask.ondone = () => {
            this.#syncing.splice(this.#syncing.indexOf(syncTask), 1)
            if (this.#syncing.length === 0) {
                this.#syncIndicator.remove()
            }
        }
        this.#syncing.push(syncTask)
        document.body.appendChild(this.#syncIndicator)
    }
}

class SyncExecTask {
    static workerUrl(kind: SyncExecJob['kind']): string {
        switch (kind) {
            case 'packages':
                return sidelines.worker.SYNC_PACKAGES
            case 'watches':
                return sidelines.worker.SYNC_WATCHES
        }
    }

    #ondone: (() => void) | null = null
    #w: Worker

    constructor(worker: SyncExecJob['kind']) {
        this.#w = new Worker(SyncExecTask.workerUrl(worker))
        this.#w.onmessage = this.#onMessage
    }

    postMessage(data: any) {
        this.#w.postMessage(data)
    }

    set ondone(cb: () => void) {
        this.#ondone = cb
    }

    #onMessage = (e: MessageEvent<SyncExecUpdate>) => {
        if (e.data.kind === 'done') {
            this.#w.onmessage = null
            this.#w.terminate()
            this.#ondone!()
        } else {
            console.error('?', JSON.stringify(e.data), new Error().stack)
        }
    }
}
