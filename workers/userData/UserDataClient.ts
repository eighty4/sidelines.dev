import type { RepositoryId } from '@sidelines/model'
import type {
    ProjectNavGetResponse,
    RepoPackagesResponse,
    UserDataRequest,
    UserDataRpcMessageBase,
    UserDataRpcRequest,
    UserDataRpcResponse,
} from './UserDataWorker.ts'

export class UserDataClient {
    readonly ghToken: string
    #responses: Record<string, (v: any) => void> = {}
    #w: Worker

    constructor(ghToken: string) {
        this.ghToken = ghToken
        this.#w = new Worker('./UserDataWorker.ts', {
            name: 'sidelines.dev user data',
        })
        this.#w.onmessage = (e: MessageEvent<UserDataRpcResponse>) =>
            this.#resolveResponse(e.data)
    }

    navVisit(repo: RepositoryId) {
        this.#request({
            kind: 'nav-update',
            repo,
        })
    }

    async navHistory(limit?: number): Promise<Array<RepositoryId>> {
        const { repos } = await this.#requestAndReply<ProjectNavGetResponse>({
            id: crypto.randomUUID(),
            kind: 'nav-get',
            limit,
        })
        return repos
    }

    async repoPackages(
        repo: RepositoryId,
    ): Promise<RepoPackagesResponse['result']> {
        const { result } = await this.#requestAndReply<RepoPackagesResponse>({
            id: crypto.randomUUID(),
            kind: 'repo-pkgs',
            ghToken: this.ghToken,
            repo,
        })
        return result
    }

    #request(request: UserDataRequest | UserDataRpcMessageBase<any>) {
        this.#w.postMessage(request)
    }

    #requestAndReply<R extends UserDataRpcResponse>(
        request: UserDataRpcRequest,
    ): Promise<R> {
        this.#request(request)
        return new Promise<R>(res => (this.#responses[request.id] = res))
    }

    #resolveResponse(data: UserDataRpcResponse) {
        const res = this.#responses[data.id]
        delete this.#responses[data.id]
        res(data)
    }
}
