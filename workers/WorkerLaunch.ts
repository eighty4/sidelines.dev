import { isMessageObject } from './messaging.ts'

type WorkerLaunchId = 'JOB_upgradeWorkflowActions'

type WorkerLaunchChannels = {
    pages: BroadcastChannel
    sharedWorkers: BroadcastChannel
    close(): void
}

function createChannels(): WorkerLaunchChannels {
    const pages = new BroadcastChannel('sidelines.worker-pool.pages')
    const sharedWorkers = new BroadcastChannel(
        'sidelines.worker-pool.sharedWorkers',
    )
    return {
        pages,
        sharedWorkers,
        close() {
            pages.close()
            sharedWorkers.close()
        },
    }
}

type RequestedWorker = {
    workerId: WorkerLaunchId
    payload: any
}

type RunningWorker = RequestedWorker & { pageId: string }

type LaunchedWorker = {
    id: WorkerLaunchId
    w: Worker
    startedWhen: Date
}

type WorkerToPageMessage =
    | {
          kind: 'request'
          requestId: string
      }
    | {
          kind: 'launch'
          pageId: string
          workerId: WorkerLaunchId
          payload: any
      }

type PageToWorkerMessage =
    | {
          kind: 'available'
          pageId: string
          requestId: string
      }
    | {
          kind: 'closing'
          pageId: string
      }

type LaunchedWorkerMessage = {
    kind: 'finished'
}

function isLaunchedWorkerMessage(data: unknown): data is LaunchedWorkerMessage {
    if (!isMessageObject(data)) {
        return false
    }
    switch (data.kind) {
        case 'finished':
            return true
        default:
            console.warn(
                'WorkerLaunch isLaunchedWorkerMessage invalid',
                data.kind,
            )
            return false
    }
}

function isWorkerToPageMessage(data: unknown): data is WorkerToPageMessage {
    if (!isMessageObject(data)) {
        return false
    }
    switch (data.kind) {
        case 'request':
        case 'launch':
            return true
        default:
            console.warn(
                'WorkerLaunch isWorkerToPageMessage invalid',
                data.kind,
            )
            return false
    }
}

function isPageToWorkerMessage(data: unknown): data is PageToWorkerMessage {
    if (!isMessageObject(data)) {
        return false
    }
    switch (data.kind) {
        case 'available':
        case 'closing':
            return true
        default:
            console.warn(
                'WorkerLaunch isPageToWorkerMessage invalid',
                data.kind,
            )
            return false
    }
}

export class PageSideWorkerLauncher {
    #broadcast = createChannels()
    #pageId = crypto.randomUUID()
    #running: Array<LaunchedWorker> = []

    constructor() {
        this.#broadcast.pages.onmessage = this.#onWorkerLaunchMessage
    }

    shutdown() {
        this.#postToSharedWorker({
            kind: 'closing',
            pageId: this.#pageId,
        })
        this.#broadcast.close()
    }

    #createWorker(workerId: WorkerLaunchId): Worker {
        switch (workerId) {
            case 'JOB_upgradeWorkflowActions':
                return new Worker(
                    './jobs/forEachViewerOwnedRepo/UpgradeWorkflowActions.ts',
                    { name: 'Sidelines.dev - upgrade GitHub workflow actions' },
                )
        }
    }

    #launch(workerId: WorkerLaunchId, payload: any) {
        console.log('WorkerLaunch launching', workerId, payload)
        const w = this.#createWorker(workerId)
        const launched = {
            id: workerId,
            w,
            startedWhen: new Date(),
        }
        this.#running.push(launched)
        w.onmessage = (e: MessageEvent<unknown>) =>
            this.#onLaunchedWorkerMessage(e, launched)
        w.postMessage(payload)
    }

    #onLaunchedWorkerMessage(
        e: MessageEvent<unknown>,
        launched: LaunchedWorker,
    ) {
        if (!isLaunchedWorkerMessage(e.data)) {
            this.#removeLaunchedWorker(launched)
            throw Error(
                'WorkerLaunch #onLaunchedWorkerMessage invalid msg: ' +
                    JSON.stringify(e.data),
            )
        }
        switch (e.data.kind) {
            case 'finished':
                this.#removeLaunchedWorker(launched)
                break
        }
    }

    #onWorkerLaunchMessage = (e: MessageEvent<unknown>) => {
        if (!isWorkerToPageMessage(e.data)) {
            throw Error(
                'WorkerLaunch #onWorkerLaunchMessage invalid msg: ' +
                    JSON.stringify(e.data),
            )
        }
        console.log('WorkerLaunch page received', e.data)
        switch (e.data.kind) {
            case 'request':
                this.#postToSharedWorker({
                    kind: 'available',
                    pageId: this.#pageId,
                    requestId: e.data.requestId,
                })
                break
            case 'launch':
                if (this.#pageId === e.data.pageId) {
                    this.#launch(e.data.workerId, e.data.payload)
                }
                break
        }
    }

    #postToSharedWorker(reply: PageToWorkerMessage) {
        console.log('WorkerLaunch page sending to shared worker', reply)
        this.#broadcast.sharedWorkers.postMessage(reply)
    }

    #removeLaunchedWorker(running: LaunchedWorker) {
        running.w.terminate()
        const i = this.#running.indexOf(running)
        if (i !== -1) {
            this.#running.splice(i, 1)
        }
    }
}

export class SharedWorkerSideWorkerLauncher {
    #broadcast = createChannels()
    // map requestId uuid to payload
    #requests: Record<string, RequestedWorker> = {}
    // map pageId uuid to worker refs
    #running: Record<string, Array<RunningWorker>> = {}

    constructor() {
        this.#broadcast.sharedWorkers.onmessage = (
            e: MessageEvent<unknown>,
        ) => {
            if (isPageToWorkerMessage(e.data)) {
                console.log('worker launch message', e.data)
                switch (e.data.kind) {
                    case 'available':
                        this.#onPageAvailable(e.data)
                        break
                    case 'closing':
                        this.#onPageClosing(e.data)
                        break
                }
            }
        }
    }

    request(workerId: WorkerLaunchId, payload: any) {
        const requestId = crypto.randomUUID()
        this.#requests[requestId] = { workerId, payload }
        this.#postToPages({
            kind: 'request',
            requestId,
        })
    }

    #onPageAvailable(msg: PageToWorkerMessage & { kind: 'available' }) {
        const requested = this.#requests[msg.requestId]
        if (requested) {
            delete this.#requests[msg.requestId]
            if (!this.#running[msg.pageId]) {
                this.#running[msg.pageId] = []
            }
            this.#running[msg.pageId].push({
                ...requested,
                pageId: msg.pageId,
            })
            this.#postToPages({
                kind: 'launch',
                pageId: msg.pageId,
                payload: requested.payload,
                workerId: requested.workerId,
            })
        }
    }

    #onPageClosing(msg: PageToWorkerMessage & { kind: 'closing' }) {
        console.log('WorkerLaunch.#onPageClosing', msg)
    }

    #postToPages(reply: WorkerToPageMessage) {
        console.log('WorkerLaunch shared worker sending to page', reply)
        this.#broadcast.pages.postMessage(reply)
    }
}
