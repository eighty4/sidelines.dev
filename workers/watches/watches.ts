import { connectToDb } from '@sidelines/data/indexeddb'
import {
    createWatch,
    deleteWatch,
    getAllWatches,
    getWatchesForRepo,
} from '@sidelines/data/tx/readWatches'
import { isMessageObject, isString } from '@sidelines/model/validate'
import type { WorkerMsg } from '../WorkerClient.ts'
import type { WatchAsyncReq, WatchRpcReq, WatchRpcRes } from './WatchesApi.ts'

declare const self: DedicatedWorkerGlobalScope

let connectingToDb = connectToDb()

async function processAsyncRequest(request: WatchAsyncReq): Promise<void> {
    switch (request.kind) {
        case 'watch-path':
            switch (request.op) {
                case 'create':
                    return await createWatch(
                        await connectingToDb,
                        request.repo,
                        request.path,
                    )
                case 'delete':
                    return await deleteWatch(
                        await connectingToDb,
                        request.repo,
                        request.path,
                    )
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
                watches: await getAllWatches(await connectingToDb),
            }
        case 'repo-watches':
            return {
                kind: request.kind,
                id: request.id,
                paths: await getWatchesForRepo(
                    await connectingToDb,
                    request.repo,
                ),
            }
        default:
            throw Error(
                (request as any).kind + ' is not an rpc user data request',
            )
    }
}

function isRpcRequest(req: WorkerMsg<any>): req is WatchRpcReq {
    return isString(req.id)
}

self.onmessage = async (e: MessageEvent<WatchAsyncReq | WatchRpcReq>) => {
    const req = e.data
    if (!isMessageObject(req)) {
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
