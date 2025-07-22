import { Subject } from 'rxjs'
import type {
    ProjectNavGetResponse,
    UserDataRequest,
    UserDataRpcMessageBase,
    UserDataRpcRequest,
    UserDataRpcResponse,
} from './userData.ts'
import type { RepositoryId } from '../model.ts'

export class UserDataClient {
    readonly ghToken: string
    readonly ghLogin: string
    #responses: Subject<UserDataRpcResponse> = new Subject()
    #w: Worker

    constructor(ghToken: string, ghLogin: string) {
        this.ghToken = ghToken
        this.ghLogin = ghLogin
        this.#w = new Worker('/lib/sidelines/worker/userData.js')
        this.#w.onmessage = (e: MessageEvent<UserDataRpcResponse>) =>
            this.#responses.next(e.data)
    }

    postNavVisit(repo: RepositoryId) {
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

    #request(request: UserDataRequest | UserDataRpcMessageBase) {
        this.#w.postMessage(request)
    }

    async #requestAndReply<R extends UserDataRpcResponse>(
        request: UserDataRpcRequest,
    ): Promise<R> {
        this.#request(request)
        return await new Promise<R>(res => {
            const sub = this.#responses.subscribe(response => {
                if (request.id === response.id) {
                    sub.unsubscribe()
                    res(response as R)
                }
            })
        })
    }
}
