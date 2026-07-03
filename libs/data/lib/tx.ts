export function idbGetRecord<T>(
    db: IDBDatabase,
    objectStore: string,
    key: any,
): Promise<T | null> {
    return new Promise((res, rej) => {
        const tx = db.transaction(objectStore, 'readonly')
        const req: IDBRequest<T | undefined> = tx
            .objectStore(objectStore)
            .get(key)

        req.onsuccess = () => res(req.result || null)

        req.onerror = e => {
            console.error(objectStore, 'getRecord error', e)
            rej(e)
        }
    })
}

export function idbDeleteRecord(
    db: IDBDatabase,
    objectStore: string,
    key: any,
): Promise<void> {
    return new Promise((res, rej) => {
        const req: IDBRequest = db
            .transaction(objectStore, 'readwrite')
            .objectStore(objectStore)
            .delete(key)

        req.onsuccess = () => res()

        req.onerror = e => {
            console.error(objectStore, 'deleteRecord error', e)
            rej(e)
        }
    })
}

export function idbAddRecord<T>(
    db: IDBDatabase,
    objectStore: string,
    record: T,
): Promise<void> {
    return new Promise((res, rej) => {
        const tx = db.transaction(objectStore, 'readwrite')
        tx.objectStore(objectStore).add(record)
        tx.oncomplete = () => res()
        tx.onerror = e => {
            console.error(objectStore, 'addRecord error', e)
            rej(e)
        }
    })
}

export function idbPutRecord<T>(
    db: IDBDatabase,
    objectStore: string,
    record: T,
): Promise<void> {
    return new Promise((res, rej) => {
        const tx = db.transaction(objectStore, 'readwrite')
        const req: IDBRequest = tx.objectStore(objectStore).put(record)

        req.onsuccess = () => res()

        req.onerror = e => {
            console.error(objectStore, 'putRecord error', e)
            rej(e)
        }
    })
}

export function idbGetComputePutRecord<T>(
    db: IDBDatabase,
    objectStore: string,
    key: any,
    compute: (record: T | null) => T,
): Promise<void> {
    return new Promise((res, rej) => {
        const tx = db.transaction(objectStore, 'readwrite')
        idbGetComputePutRecordWithTx(tx, objectStore, key, compute)
        tx.oncomplete = () => res()
        tx.onerror = e => {
            console.error(objectStore, 'idbGetComputePutRecord error', e)
            rej(e)
        }
    })
}

export function idbGetComputePutRecordWithTx<T>(
    tx: IDBTransaction,
    objectStore: string,
    key: any,
    compute: (record: T | null) => T,
): void {
    const os = tx.objectStore(objectStore)
    const req: IDBRequest<T | undefined> = os.get(key)
    req.onsuccess = () => os.put(compute(req.result || null))
}
