export type StoreData = {
    store: string
    // key path fields
    keys: Array<string>
    // non key fields
    fields: Array<string>
    objects: Array<Record<string, any>>
}

export async function getDbStoreData(
    db: IDBDatabase,
    store: string,
): Promise<StoreData> {
    return new Promise((res, rej) => {
        const req: IDBRequest<Array<Record<string, any>>> = db
            .transaction(store)
            .objectStore(store)
            .getAll()
        req.onsuccess = () => {
            const keyPath = (req.source as IDBObjectStore).keyPath
            const keys = Array.isArray(keyPath) ? keyPath : [keyPath]
            const fields = Array.from(
                new Set(req.result.flatMap(object => Object.keys(object))),
            )
                .filter(field => !keys.includes(field))
                .sort()
            res({
                store,
                keys,
                fields,
                objects: req.result,
            })
        }
        req.onerror = rej
    })
}
