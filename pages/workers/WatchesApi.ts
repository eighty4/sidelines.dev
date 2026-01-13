import type { RepositoryId, RepoWatches } from '@sidelines/model'
import {
    WorkerClient,
    type WorkerMsg,
    type WorkerRpcMsg,
} from './WorkerClient.ts'

export type WatchPathReq = {
    repo: RepositoryId
    path: string
    op: 'create' | 'delete'
} & WorkerMsg<'watch-path'>

export type GetAllWatchesReq = WorkerRpcMsg<'all-watches'>

export type GetAllWatchesRes = {
    watches: Array<RepoWatches>
} & WorkerRpcMsg<GetAllWatchesReq['kind']>

export type GetRepoWatchesReq = {
    repo: RepositoryId
} & WorkerRpcMsg<'repo-watches'>

export type GetRepoWatchesRes = {
    paths: Array<string>
} & WorkerRpcMsg<GetRepoWatchesReq['kind']>

export type WatchAsyncReq = WatchPathReq
export type WatchRpcReq = GetAllWatchesReq | GetRepoWatchesReq
export type WatchRpcRes = GetAllWatchesRes | GetRepoWatchesRes

export class WatchesApi extends WorkerClient {
    constructor() {
        super(
            new Worker('./watches.ts', {
                name: 'sidelines.dev watches',
            }),
            'Worker(watches.ts)',
        )
    }

    createWatch(repo: RepositoryId, path: string) {
        this.#watchPath(repo, path, 'create')
    }

    deleteWatch(repo: RepositoryId, path: string) {
        this.#watchPath(repo, path, 'delete')
    }

    async getAllWatches(): Promise<Array<RepoWatches>> {
        const { watches } = await this.requestAndReply<
            GetAllWatchesReq['kind'],
            GetAllWatchesReq,
            GetAllWatchesRes
        >({ kind: 'all-watches' })
        return watches
    }

    async getRepoWatches(repo: RepositoryId): Promise<Array<string>> {
        const { paths } = await this.requestAndReply<
            GetRepoWatchesReq['kind'],
            GetRepoWatchesReq,
            GetRepoWatchesRes
        >({
            kind: 'repo-watches',
            repo,
        })
        return paths
    }

    #watchPath(repo: RepositoryId, path: string, op: 'create' | 'delete') {
        this.request<'watch-path', WatchPathReq>({
            kind: 'watch-path',
            repo,
            path,
            op,
        })
    }
}
