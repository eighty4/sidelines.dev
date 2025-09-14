import { Subject } from 'rxjs'

export type WorkerMsg<KIND extends string> = { kind: KIND }

export type WorkerRpcMsg<KIND extends string> = WorkerMsg<KIND> & { id: string }

export class WorkerClient {
    #name: string
    #responses: Subject<any> = new Subject()
    #w: Worker

    constructor(p: string) {
        this.#name = p.replace('/lib/sidelines/workers/', '')
        this.#w = new Worker(p)
        this.#w.onmessage = (e: MessageEvent<any>) =>
            this.#responses.next(e.data)
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
        return await new Promise<RES>(res => {
            const sub = this.#responses.subscribe(response => {
                if (request.id === response.id) {
                    sub.unsubscribe()
                    res(response)
                }
            })
        })
    }

    protected terminate() {
        this.#w.terminate()
        this.#responses.complete()
    }
}
