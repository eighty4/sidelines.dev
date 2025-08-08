export interface SessionCache<T> {
    clear(): void

    expect(): T

    hasValue(): boolean

    read(): T | null

    write(data: T): void
}

type StorageApi =
    | typeof globalThis.localStorage
    | typeof globalThis.sessionStorage

export function createCache(
    storage: StorageApi,
    key: string,
): SessionCache<string> {
    return {
        clear() {
            storage.removeItem(key)
        },
        expect() {
            return this.read()!
        },
        hasValue() {
            return storage.getItem(key) !== null
        },
        read() {
            return storage.getItem(key)
        },
        write(data: string) {
            storage.setItem(key, data)
        },
    }
}

export function createJsonCache<T>(
    storage: StorageApi,
    key: string,
): SessionCache<T> {
    return {
        clear() {
            storage.removeItem(key)
        },
        expect() {
            return this.read()!
        },
        hasValue() {
            return storage.getItem(key) !== null
        },
        read() {
            const data = storage.getItem(key)
            return data === null ? null : JSON.parse(data)
        },
        write(data: T) {
            storage.setItem(key, JSON.stringify(data))
        },
    }
}
