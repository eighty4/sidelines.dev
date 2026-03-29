import { SyncIndicator } from './SyncIndicator.ts'
import {
    createChannel,
    type RepoSyncRef,
    type SyncExecAvailable,
    type SyncExecReq,
    type SyncRefsEvent,
    type SyncRefsInit,
    type SyncWorkerEvent,
} from './syncMessaging.ts'

export class SyncRefsClient {
    #broadcast: BroadcastChannel = createChannel()
    #ghToken: string
    #pageId: string = crypto.randomUUID()
    #syncIndicator: SyncIndicator = new SyncIndicator()
    #syncing: Array<SyncExecTask> = []
    #w: SharedWorker = new SharedWorker('./syncRefs.ts', {
        name: 'sidelines.dev syncing',
    })

    constructor(ghToken: string) {
        this.#ghToken = ghToken
        this.#w.port.postMessage({
            kind: 'init',
            ghToken,
            pageId: this.#pageId,
        })
        this.#w.onerror = (e: any) =>
            console.log('sync refs shared worker err', e)
        this.#w.port.onmessage = this.#onSharedWorkerMessage
        this.#broadcast.onmessage = this.#onBroadcastMessage
    }

    // negotiate worker distribution over broadcast channel
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
    #onSharedWorkerMessage = (e: MessageEvent<SyncRefsEvent>) => {
        for (const task of ['packages', 'watches'] as const) {
            const syncTask = new SyncExecTask(task, () =>
                this.#removeSyncTask(syncTask),
            )
            syncTask.init(this.#ghToken, e.data.repos)
            this.#syncing.push(syncTask)
        }
        document.body.appendChild(this.#syncIndicator)
    }

    #removeSyncTask(syncTask: SyncExecTask) {
        this.#syncing.splice(this.#syncing.indexOf(syncTask), 1)
        if (this.#syncing.length === 0) {
            this.#syncIndicator.remove()
        }
    }
}

class SyncExecTask {
    static worker(task: 'packages' | 'watches'): Worker {
        switch (task) {
            case 'packages':
                return new Worker('./syncPackages.ts', {
                    name: 'sidelines.dev sync packages',
                })
            case 'watches':
                return new Worker('./syncWatches.ts', {
                    name: 'sidelines.dev sync watches',
                })
        }
    }

    #ondone: (() => void) | null = null
    #w: Worker

    constructor(task: 'packages' | 'watches', ondone: () => void) {
        this.#w = SyncExecTask.worker(task)
        this.#w.onmessage = this.#onMessage
        this.#ondone = ondone
    }

    init(ghToken: string, repos: Array<RepoSyncRef>) {
        this.#postMessage({
            kind: 'sync',
            ghToken,
            repos,
        })
    }

    #postMessage(data: SyncRefsInit) {
        this.#w.postMessage(data)
    }

    #onMessage = (e: MessageEvent<SyncWorkerEvent>) => {
        if (e.data.kind === 'done') {
            this.#w.onmessage = null
            this.#w.terminate()
            this.#ondone!()
        } else {
            console.error('?', JSON.stringify(e.data), new Error().stack)
        }
    }
}
