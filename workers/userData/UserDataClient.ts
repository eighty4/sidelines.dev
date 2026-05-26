import type { RepositoryId, RepositoryObject } from '@sidelines/model'
import type {
    ProjectNavGetResponse,
    RepoListingResponse,
    RepoObjectResponse,
    RepoPackagesResponse,
    UserDataRequest,
    UserDataRpcMessageBase,
    UserDataRpcRequest,
    UserDataRpcResponse,
} from './UserDataWorker.ts'

export class UserDataClient {
    readonly ghToken: string
    readonly ghLogin: string
    #responses: Record<string, (v: any) => void> = {}
    #w: Worker

    constructor(ghToken: string, ghLogin: string) {
        this.ghToken = ghToken
        this.ghLogin = ghLogin
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

    async repoContent(
        repo: RepositoryId,
        dirpath: string | null,
        filename: string,
    ): Promise<string> {
        const { content } = await this.#requestAndReply<RepoObjectResponse>({
            id: crypto.randomUUID(),
            kind: 'repo-cat',
            ghToken: this.ghToken,
            repo,
            dirpath,
            filename,
        })
        return content
    }

    async repoListing(
        repo: RepositoryId,
        dirpath: string | null,
    ): Promise<Array<RepositoryObject> | 'repo-not-found'> {
        const { objects } = await this.#requestAndReply<RepoListingResponse>({
            id: crypto.randomUUID(),
            kind: 'repo-ls',
            ghToken: this.ghToken,
            repo,
            dirpath,
        })
        return objects
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
