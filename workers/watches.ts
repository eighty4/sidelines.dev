import {
    createWatch,
    deleteWatch,
    getAllWatches,
    getWatchesForRepo,
} from '@sidelines/data/indexeddb'
import type { WatchAsyncReq, WatchRpcReq, WatchRpcRes } from './WatchesApi.ts'
import type { WorkerMsg } from './WorkerClient.ts'

declare const self: DedicatedWorkerGlobalScope

async function processAsyncRequest(request: WatchAsyncReq): Promise<void> {
    switch (request.kind) {
        case 'watch-path':
            switch (request.op) {
                case 'create':
                    return await createWatch(request.repo, request.path)
                case 'delete':
                    return await deleteWatch(request.repo, request.path)
            }
        default:
            throw Error(request.kind + ' is not an async user data request')
    }
}

async function processRpcRequest(request: WatchRpcReq): Promise<WatchRpcRes> {
    switch (request.kind) {
        case 'all-watches':
            return {
                kind: request.kind,
                id: request.id,
                watches: await getAllWatches(),
            }
        case 'repo-watches':
            return {
                kind: request.kind,
                id: request.id,
                paths: await getWatchesForRepo(request.repo),
            }
        default:
            throw Error(
                (request as any).kind + ' is not an rpc user data request',
            )
    }
}

function isWorkerMessage(req: unknown): req is WorkerMsg<any> {
    if (req === null || typeof req !== 'object') {
        return false
    }
    return 'kind' in req && typeof req.kind === 'string'
}

function isRpcRequest(req: any): req is WatchRpcReq {
    return 'id' in req && typeof req.id === 'string'
}

self.onmessage = async (e: MessageEvent<WatchAsyncReq | WatchRpcReq>) => {
    const req = e.data
    if (!isWorkerMessage(req)) {
        console.error('watches.js onmessage bad input', req)
        self.close()
    } else {
        try {
            if (isRpcRequest(req)) {
                self.postMessage(await processRpcRequest(req))
            } else {
                await processAsyncRequest(req)
            }
        } catch (e) {
            console.error('error processing', req.kind, 'request:', e)
        }
    }
}

self.onmessageerror = e => console.error('worker watches.js onmessageerror', e)
