import { isMessageObject } from '@sidelines/model'
import { ulid } from 'ulid'

export type WorkerLaunchId =
    | 'DATA_resolveRepoJobRepos'
    | 'JOB_SCHEDULED_sync'
    | 'JOB_SYNC_packages'
    | 'JOB_SYNC_watches'
    | 'JOB_REPO_upgradeWorkflowActions'

function createWorkerFromLaunchId(workerId: WorkerLaunchId): Worker {
    switch (workerId) {
        case 'DATA_resolveRepoJobRepos':
            return new Worker('./jobs/ResolveRepoJobReposWorker.ts', {
                name: 'Sidelines.dev - resolve repo job repos',
            })
        case 'JOB_SCHEDULED_sync':
            return new Worker('./jobs/scheduled/SyncRefs.ts', {
                name: 'Sidelines.dev - sync refs',
            })
        case 'JOB_SYNC_packages':
            return new Worker('./jobs/syncedRefs/SyncPackages.ts', {
                name: 'Sidelines.dev - sync packages',
            })
        case 'JOB_SYNC_watches':
            return new Worker('./jobs/syncedRefs/SyncWatches.ts', {
                name: 'Sidelines.dev - sync watches',
            })
        case 'JOB_REPO_upgradeWorkflowActions':
            return new Worker('./jobs/repos/UpgradeWorkflowActions.ts', {
                name: 'Sidelines.dev - upgrade GitHub workflow actions',
            })
    }
}

type RequestedWorker = {
    workerId: WorkerLaunchId
    payload: any
}

type RunningWorker = RequestedWorker & {
    pageId: string
    instanceId: string
}

type LaunchedWorker = {
    workerId: WorkerLaunchId
    // scheduling requestId becomes instanceId
    instanceId: string
    w: Worker
    startedWhen: Date
}

type SharedWorkerToPageMessage = {
    kind: 'launch'
    instanceId: string
    pageId: string
    workerId: WorkerLaunchId
    payload: any
}

type SharedWorkerToAllPagesMessage = {
    kind: 'request'
    requestId: string
}

type PageToSharedWorkerMessage =
    | {
          kind: 'available'
          pageId: string
          requestId: string
      }
    | {
          kind: 'finished'
          pageId: string
          instanceId: string
      }
    | {
          kind: 'closing'
          pageId: string
      }

export type LaunchedWorkerMessage = {
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

function isSharedWorkerToAllPagesMessage(
    data: unknown,
): data is SharedWorkerToAllPagesMessage {
    if (!isMessageObject(data)) {
        return false
    }
    switch (data.kind) {
        case 'request':
            return true
        default:
            console.warn(
                'WorkerLaunch isSharedWorkerToAllPagesMessage invalid',
                data.kind,
            )
            return false
    }
}

function isSharedWorkerToPageMessage(
    data: unknown,
): data is SharedWorkerToPageMessage {
    if (!isMessageObject(data)) {
        return false
    }
    switch (data.kind) {
        case 'launch':
            return true
        default:
            console.warn(
                'WorkerLaunch isSharedWorkerToPageMessage invalid',
                data.kind,
            )
            return false
    }
}

function isPageToSharedWorkerMessage(
    data: unknown,
): data is PageToSharedWorkerMessage {
    if (!isMessageObject(data)) {
        return false
    }
    switch (data.kind) {
        case 'available':
        case 'closing':
            return true
        default:
            console.warn(
                'WorkerLaunch isPageToSharedWorkerMessage invalid',
                data.kind,
            )
            return false
    }
}

class WorkerLaunchPageChannels {
    readonly allPages: BroadcastChannel = new BroadcastChannel(
        'sidelines.WorkerLaunch.pages',
    )
    readonly page: BroadcastChannel
    readonly sharedWorker: BroadcastChannel = new BroadcastChannel(
        'sidelines.WorkerLaunch.sharedWorker',
    )

    constructor(pageId: string) {
        this.page = new BroadcastChannel(
            `sidelines.WorkerLaunch.page.${pageId}`,
        )
    }

    close() {
        this.allPages.close()
        this.page.close()
        this.sharedWorker.close()
    }
}

export class PageSideWorkerLauncher {
    #channels: WorkerLaunchPageChannels
    #pageId = crypto.randomUUID()
    #running: Array<LaunchedWorker> = []

    constructor() {
        this.#channels = new WorkerLaunchPageChannels(this.#pageId)
        this.#channels.allPages.onmessage =
            this.#onSharedWorkerToAllPagesMessage
        this.#channels.page.onmessage = this.#onSharedWorkerToPageMessage
    }

    shutdown() {
        this.#postToSharedWorker({
            kind: 'closing',
            pageId: this.#pageId,
        })
        this.#channels.close()
    }

    #launch(workerId: WorkerLaunchId, instanceId: string, payload: any) {
        console.log('WorkerLaunch launching', workerId, payload)
        const w = createWorkerFromLaunchId(workerId)
        const launched: LaunchedWorker = {
            workerId,
            instanceId,
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
                this.#postToSharedWorker({
                    kind: 'finished',
                    pageId: this.#pageId,
                    instanceId: launched.instanceId,
                })
                break
        }
    }

    #onSharedWorkerToAllPagesMessage = (e: MessageEvent<unknown>) => {
        if (!isSharedWorkerToAllPagesMessage(e.data)) {
            throw Error(
                'WorkerLaunch #onSharedWorkerToAllPagesMessage invalid msg: ' +
                    JSON.stringify(e.data),
            )
        }
        console.log(
            'WorkerLaunch received SharedWorkerToAllPagesMessage',
            e.data,
        )
        switch (e.data.kind) {
            case 'request':
                this.#postToSharedWorker({
                    kind: 'available',
                    pageId: this.#pageId,
                    requestId: e.data.requestId,
                })
                break
        }
    }

    #onSharedWorkerToPageMessage = (e: MessageEvent<unknown>) => {
        if (!isSharedWorkerToPageMessage(e.data)) {
            throw Error(
                'WorkerLaunch #onSharedWorkerToPageMessage invalid msg: ' +
                    JSON.stringify(e.data),
            )
        }
        console.log('WorkerLaunch received SharedWorkerToPageMessage', e.data)
        switch (e.data.kind) {
            case 'launch':
                this.#launch(e.data.workerId, e.data.instanceId, e.data.payload)
                break
        }
    }

    #postToSharedWorker(reply: PageToSharedWorkerMessage) {
        console.log('WorkerLaunch sending PageToSharedWorkerMessage', reply)
        this.#channels.sharedWorker.postMessage(reply)
    }

    #removeLaunchedWorker(finished: LaunchedWorker) {
        finished.w.terminate()
        const i = this.#running.indexOf(finished)
        if (i !== -1) {
            this.#running.splice(i, 1)
        }
    }
}

class WorkerLaunchSharedWorkerChannels {
    readonly allPages: BroadcastChannel = new BroadcastChannel(
        'sidelines.WorkerLaunch.pages',
    )
    readonly #pages: Record<string, BroadcastChannel> = {}
    readonly sharedWorker: BroadcastChannel = new BroadcastChannel(
        'sidelines.WorkerLaunch.sharedWorker',
    )

    page(pageId: string): BroadcastChannel {
        const page = this.#pages[pageId]
        if (page) {
            return page
        } else {
            return (this.#pages[pageId] = new BroadcastChannel(
                `sidelines.WorkerLaunch.page.${pageId}`,
            ))
        }
    }

    close() {
        this.allPages.close()
        Object.values(this.#pages).forEach(p => p.close())
        this.sharedWorker.close()
    }
}

export class SharedWorkerSideWorkerLauncher {
    #channels = new WorkerLaunchSharedWorkerChannels()
    // map requestId uuid to payload
    #requests: Record<string, RequestedWorker> = {}
    // map pageId uuid to worker refs
    #running: Record<string, Array<RunningWorker>> = {}

    constructor() {
        this.#channels.sharedWorker.onmessage =
            this.#onPageToSharedWorkerMessage
    }

    request(workerId: WorkerLaunchId, payload: any) {
        const requestId = ulid()
        this.#requests[requestId] = { workerId, payload }
        this.#channels.allPages.postMessage({
            kind: 'request',
            requestId,
        } satisfies SharedWorkerToAllPagesMessage)
    }

    #onPageAvailable(msg: PageToSharedWorkerMessage & { kind: 'available' }) {
        const requested = this.#requests[msg.requestId]
        if (requested) {
            delete this.#requests[msg.requestId]
            if (!this.#running[msg.pageId]) {
                this.#running[msg.pageId] = []
            }
            this.#running[msg.pageId].push({
                ...requested,
                instanceId: msg.requestId,
                pageId: msg.pageId,
            })
            this.#channels.page(msg.pageId).postMessage({
                kind: 'launch',
                pageId: msg.pageId,
                instanceId: msg.requestId,
                payload: requested.payload,
                workerId: requested.workerId,
            } satisfies SharedWorkerToPageMessage)
        }
    }

    #onPageClosing(msg: PageToSharedWorkerMessage & { kind: 'closing' }) {
        console.log('WorkerLaunch.#onPageClosing', msg)
    }

    #onPageToSharedWorkerMessage = (e: MessageEvent<unknown>) => {
        if (!isPageToSharedWorkerMessage(e.data)) {
            throw Error(
                'WorkerLaunch #onPageToSharedWorkerMessage invalid msg: ' +
                    JSON.stringify(e.data),
            )
        }
        console.log('WorkerLaunch received PageToSharedWorkerMessage', e.data)
        switch (e.data.kind) {
            case 'available':
                this.#onPageAvailable(e.data)
                break
            case 'closing':
                this.#onPageClosing(e.data)
                break
            case 'finished':
                this.#onWorkerFinished(e.data.pageId, e.data.instanceId)
        }
    }

    #onWorkerFinished(pageId: string, instanceId: string) {
        const pageWorkers = this.#running[pageId]
        const i = pageWorkers.findIndex(w => w.instanceId === instanceId)
        if (i !== -1) {
            pageWorkers.splice(i, 1)
        }
    }
}
