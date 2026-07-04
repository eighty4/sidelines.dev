import type { BrowserContext } from '@playwright/test'
import { shouldEncodeValue, toEncodedValue } from './idbEncodedValue.ts'
import {
    toIDBKeyPath,
    type IDBDatabaseStorageState,
    type IDBIndexStorageState,
    type IDBRecordStorageState,
    type OriginStorageState,
} from './idbState.ts'

export type CreateIDBDatabase = {
    name: string
    version: number
    stores: Record<string, CreateIDBObjectStore>
    records: Record<string, any>
}

export type CreateIDBObjectStore = {
    autoIncrement?: boolean
    indices: Array<CreateIDBIndex>
    keyPath: Array<string> | string
}

export type CreateIDBIndex = {
    name: string
    keyPath: Array<string> | string
    multiEntry?: boolean
    unique?: boolean
}

export async function setIndexedDBStorageState(
    baseURL: string,
    context: BrowserContext,
    creating: CreateIDBDatabase,
) {
    const database = createDatabase(creating)
    const state = await context.storageState({ indexedDB: true })
    const existingOrigin = state.origins.find(
        originState => originState.origin === baseURL,
    ) as OriginStorageState | undefined
    if (existingOrigin) {
        const existingDb = existingOrigin.indexedDB.findIndex(
            db => db.name === creating.name,
        )
        if (existingDb > -1) {
            if (
                existingOrigin.indexedDB[existingDb].version !==
                creating.version
            ) {
                throw TypeError()
            } else {
                existingOrigin.indexedDB.splice(existingDb, 1)
            }
        }
        existingOrigin.indexedDB.push(database)
    } else {
        const originState: OriginStorageState = {
            indexedDB: [database],
            localStorage: [],
            origin: baseURL,
        }
        state.origins.push(originState)
    }
    await context.setStorageState(state)
}

function createDatabase(creating: CreateIDBDatabase): IDBDatabaseStorageState {
    return {
        name: creating.name,
        version: creating.version,
        stores: Object.entries(creating.stores).map(([name, store]) => {
            return {
                ...toIDBKeyPath(store.keyPath),
                name,
                autoIncrement: store.autoIncrement ?? false,
                indexes: store.indices.map(index => {
                    return {
                        ...toIDBKeyPath(index.keyPath),
                        name: index.name,
                        multiEntry: index.multiEntry ?? false,
                        unique: index.unique ?? false,
                    } satisfies IDBIndexStorageState
                }),
                records: !creating.records[name]?.length
                    ? []
                    : creating.records[name].map(createRecord),
            }
        }),
    }
}

function createRecord(record: any): IDBRecordStorageState {
    return shouldEncodeValue(record)
        ? { valueEncoded: toEncodedValue(record) }
        : { value: record }
}
