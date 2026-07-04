import type { BrowserContext } from '@playwright/test'
import { fromEncodedValue, type EncodedValue } from './idbEncodedValue.ts'

export type OriginStorageState = {
    origin: string
    localStorage: Array<any>
    indexedDB: Array<IDBDatabaseStorageState>
}

export type IDBDatabaseStorageState = {
    name: string
    version: number
    stores: Array<IDBObjectStoreStorageState>
}

export type IDBObjectStoreStorageState = IDBKeyPath & {
    name: string
    autoIncrement: boolean
    records: Array<IDBRecordStorageState>
    indexes: Array<IDBIndexStorageState>
}

export type IDBIndexStorageState = IDBKeyPath & {
    name: string
    multiEntry: boolean
    unique: boolean
}

export type IDBKeyPath = { keyPathArray: Array<string> } | { keyPath: string }

export function toIDBKeyPath(keyPath: Array<string> | string): IDBKeyPath {
    return Array.isArray(keyPath) ? { keyPathArray: keyPath } : { keyPath }
}

export type IDBRecordStorageState =
    | {
          value: any
      }
    | {
          valueEncoded: EncodedValue
      }

export type IDBDatabaseRead = {
    db: string
    version: number
    records: Record<string, Array<any>>
}

export async function indexedDBStateFrom(
    baseURL: string,
    context: BrowserContext,
    print: boolean = false,
): Promise<IDBDatabaseRead> {
    const storageState = await context.storageState({ indexedDB: true })
    const originStates =
        storageState.origins as unknown as Array<OriginStorageState>
    const originState = originStates.find(
        originState => originState.origin === baseURL,
    )
    if (!originState) {
        if (!storageState.origins.length) {
            throw Error(
                'context.storageState did not return storage state for any origins',
            )
        } else {
            const originList = storageState.origins
                .map(originState => originState.origin)
                .join(', ')
            throw Error(
                `context.storageState baseURL "${baseURL}" not found in origins: ${originList}`,
            )
        }
    }
    if (originState.indexedDB.length !== 1) {
        throw Error(
            `context.storageState for baseURL "${baseURL}" did not have an IndexedDB db`,
        )
    }
    const indexedDBState = originState.indexedDB[0]
    const records: IDBDatabaseRead['records'] = {}
    for (const objectStore of indexedDBState.stores) {
        records[objectStore.name] = objectStore.records.map(record => {
            if ('value' in record) {
                return record.value
            } else if (record.valueEncoded) {
                try {
                    return fromEncodedValue(record.valueEncoded)
                } catch (e: any) {
                    throw Error(`\
ObjectStore \`${objectStore.name}\` has a record that was not mapped from the Playwright IndexedDBRecordStorageState's EncodedValue format.\
The record data from Playwright is: ${JSON.stringify(record)}.\
The unexpected EncodedValue that could not be extracted is: ${e.message}.`)
                }
            } else {
                throw Error(`\
ObjectStore \`${objectStore.name}\` has a record that was not mapped from Playwright's IndexedDBRecordStorageState representation.\
The record data from Playwright is: ${JSON.stringify(record)}.`)
            }
        })
    }
    const content = {
        db: indexedDBState.name,
        version: indexedDBState.version,
        records,
    }
    if (print) {
        debugPrintIndexedDBContent(content)
    }
    return content
}

export function debugPrintIndexedDBContent(content: IDBDatabaseRead) {
    const header = `~~~ IndexedDB ${content.db} v${content.version} ~~~`
    const separator = '~'.repeat(header.length)
    console.log(separator)
    console.log(header)
    console.log(separator)
    for (const [objectStore, records] of Object.entries(content.records)) {
        console.log('~~~', objectStore, '~~~')
        console.log(JSON.stringify(records, null, 4))
    }
}
