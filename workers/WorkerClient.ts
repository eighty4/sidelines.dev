export type WorkerMsg<KIND extends string> = { kind: KIND } & {
    [key: string]: unknown
}

export type WorkerRpcMsg<KIND extends string> = WorkerMsg<KIND> & { id: string }

export class WorkerClient {
    #name: string
    #responses: Record<string, (v: any) => void> = {}
    #w: Worker

    constructor(w: Worker, name: string = 'WorkerClient') {
        this.#name = name
        this.#w = w
        this.#w.onmessage = (e: MessageEvent<any>) =>
            this.#resolveResponse(e.data)
    }

    protected createId(): string {
        return crypto.randomUUID()
    }

    protected request<KIND extends string, REQ extends WorkerMsg<KIND>>(
        request: REQ,
    ) {
        console.log(this.#name, request.kind, request)
        this.#w.postMessage(request)
    }

    protected async requestAndReply<
        KIND extends string,
        REQ extends WorkerRpcMsg<KIND>,
        RES extends WorkerRpcMsg<KIND>,
    >(payload: Omit<REQ, 'id'>): Promise<RES> {
        const request = payload as REQ
        request.id = this.createId()
        this.request(request)
        return new Promise<RES>(res => (this.#responses[request.id] = res))
    }

    #resolveResponse<KIND extends string, RES extends WorkerRpcMsg<KIND>>(
        data: RES,
    ) {
        const res = this.#responses[data.id]
        delete this.#responses[data.id]
        res(data)
    }

    protected terminate() {
        this.#w.terminate()
    }
}
