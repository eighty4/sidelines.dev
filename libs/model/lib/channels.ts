export type DataCallback<T> = (data: T) => void

export type DataSubscription = {
    unsubscribe(): void
}

export class ChannelDataSubscription<T> implements DataSubscription {
    #c: BroadcastChannel

    constructor(c: BroadcastChannel, cb: DataCallback<T>) {
        this.#c = c
        c.onmessage = (e: MessageEvent<T>) => cb(e.data)
    }

    unsubscribe(): void {
        this.#c.onmessage = null
        this.#c.close()
    }
}

export class BroadcastChannelData<T> {
    #c: BroadcastChannel
    #proxy: Array<(data: T) => void> = []

    constructor(c: BroadcastChannel) {
        this.#c = c
    }

    subscribe(cb: (data: T) => void): DataSubscription {
        this.#proxy.push(cb)
        if (!this.#c.onmessage) {
            this.#c.onmessage = this.#onmessage
        }
        return {
            unsubscribe: () => {
                const i = this.#proxy.indexOf(cb)
                if (i !== -1) {
                    this.#proxy.splice(this.#proxy.indexOf(cb), 1)
                }
            },
        }
    }

    #onmessage = (e: MessageEvent<unknown>) => {
        for (const s of this.#proxy) {
            s(e.data as T)
        }
    }
}
