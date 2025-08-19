export type StoreMetadata = {
    store: string
    // IDBObjectStore.keyPaths
    keys: Array<string>
    // IDBIndex.keyPaths mapped by index names
    indexKeys: Record<string, Array<string>>
    indexNames: Array<string>
    // non-key fields collected from all records
    fields: Array<string>
}

export async function getDbStoreMetadata(
    db: IDBDatabase,
    store: string,
): Promise<StoreMetadata> {
    return new Promise((res, rej) => {
        const tx = db.transaction(store)
        const objectStore = tx.objectStore(store)
        const keyPath = objectStore.keyPath!
        const keys = Array.isArray(keyPath) ? keyPath : [keyPath]
        const indexNames = Array.from(objectStore.indexNames).sort()
        const indexKeys: Record<string, Array<string>> = {}
        indexNames
            .map(index => objectStore.index(index))
            .forEach(index => {
                indexKeys[index.name] = Array.isArray(index.keyPath)
                    ? index.keyPath
                    : [index.keyPath]
            })
        const fields = new Set<string>()
        const req: IDBRequest = objectStore.openCursor()
        req.onsuccess = e => {
            const cursor: IDBCursorWithValue | null = (e.target as any).result
            if (cursor) {
                Object.keys(cursor.value).forEach(field => fields.add(field))
                cursor.continue()
            }
        }

        req.onerror = rej

        tx.oncomplete = () =>
            res({
                store,
                keys,
                indexKeys,
                indexNames,
                fields: Array.from(fields)
                    .filter(field => !keys.includes(field))
                    .sort(),
            })
    })
}

export async function queryDbStore(
    db: IDBDatabase,
    store: string,
    direction: IDBCursorDirection = 'next',
): Promise<Array<Record<string, any>>> {
    const tx = db.transaction(store)
    const req: IDBRequest<IDBCursorWithValue | null> = tx
        .objectStore(store)
        .openCursor(null, direction)
    return await consumeObjectCursor(tx, req)
}

export async function queryDbStoreIndex(
    db: IDBDatabase,
    store: string,
    index: string,
    direction: IDBCursorDirection = 'next',
): Promise<Array<Record<string, any>>> {
    const tx = db.transaction(store)
    const req: IDBRequest<IDBCursorWithValue | null> = tx
        .objectStore(store)
        .index(index)
        .openCursor(null, direction)
    return await consumeObjectCursor(tx, req)
}

function consumeObjectCursor(
    tx: IDBTransaction,
    req: IDBRequest<IDBCursorWithValue | null>,
): Promise<Array<Record<string, any>>> {
    return new Promise((res, rej) => {
        const objects: Array<Record<string, any>> = []

        req.onsuccess = () => {
            const cursor: IDBCursorWithValue | null = req.result
            if (cursor) {
                objects.push(cursor.value)
                cursor.continue()
            }
        }

        tx.oncomplete = () => res(objects)

        tx.onerror = rej
    })
}
