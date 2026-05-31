import type { BrowserContext } from '@playwright/test'

type OriginStorageState = {
    origin: string
    localStorage: Array<any>
    indexedDB: Array<IndexedDBStorageState>
}

type IndexedDBStorageState = {
    name: string
    version: number
    stores: Array<IndexedDBStoreStorageState>
}

type IndexedDBStoreStorageState = {
    name: string
    autoIncrement: boolean
    keyPathArray: Array<string>
    records: Array<IndexedDBRecordStorageState>
    indexes: Array<IndexedDBIndexStorageState>
}

type IndexedDBRecordStorageState = {
    value?: any
    valueEncoded?: EncodedValue & {
        id: number
    }
}

type EncodedValue =
    | {
          a: [EncodedValue]
      }
    | {
          d: {
              value: string
          }
      }
    | {
          o: Array<{
              k: string
              v: EncodedValue
          }>
      }
    | {
          v: any
      }

type IndexedDBIndexStorageState = {
    name: string
    keyPath: string
    multiEntry: boolean
    unique: boolean
}

const SidelinesColumnFamilies = [
    'job-log',
    'commit-review',
    // 'read-commits',
    'read-watches',
    'repo-context',
    'repo-nav',
    'repo-objects',
    'repo-heads',
    'repo-pkgs',
    'repo-syncing',
    'sync-log',
] as const

export type SidelinesColumnFamily = (typeof SidelinesColumnFamilies)[number]

function isSidelinesColumnFamily(name: string): name is SidelinesColumnFamily {
    return SidelinesColumnFamilies.includes(name as any)
}

export type IndexedDBContent = {
    db: string
    version: number
    records: Record<SidelinesColumnFamily, Array<any>>
}

export async function indexedDBStateFrom(
    baseURL: string,
    context: BrowserContext,
    print: boolean = false,
): Promise<IndexedDBContent> {
    const storageState = await context.storageState({ indexedDB: true })
    const originState = (
        storageState.origins as unknown as Array<OriginStorageState>
    ).find(originState => originState.origin === baseURL)
    if (!originState) {
        throw Error('origin not found')
    }
    if (originState.indexedDB.length !== 1) {
        throw Error('db not found')
    }
    const indexedDBState = originState.indexedDB[0]
    const records: IndexedDBContent['records'] = {
        'job-log': [],
        'commit-review': [],
        // 'read-commits': [],
        'read-watches': [],
        'repo-context': [],
        'repo-nav': [],
        'repo-objects': [],
        'repo-heads': [],
        'repo-pkgs': [],
        'repo-syncing': [],
        'sync-log': [],
    }
    for (const objectStore of indexedDBState.stores) {
        if (!isSidelinesColumnFamily(objectStore.name)) {
            throw Error(`\
ObjectStore \`${objectStore.name}\` was unexpected when collecting data from IndexedDB during Playwright tests.\
Verify \`SidelinesColumnFamilies\` in tests/indexedDBState.ts was updated with any object store additions in \`@sidelines/data\`.`)
        } else if (objectStore.records.length) {
            records[objectStore.name] = objectStore.records.map(record => {
                if (record.value) {
                    return record.value
                } else if (record.valueEncoded) {
                    try {
                        return mapEncodedValue(record.valueEncoded)
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
    }
    if (indexedDBState.stores.length !== SidelinesColumnFamilies.length) {
        const extras = Array.from(
            new Set(
                indexedDBState.stores.map(objectStore => objectStore.name),
            ).symmetricDifference(new Set(SidelinesColumnFamilies)),
        )
        throw Error(`\
ObjectStores were removed from \`@sidelines/data\` without removing from \`SidelinesColumnFamilies\` in tests/indexedDBState.ts.\
The offending ObjectStore names are: [${extras.map(name => `"${name}"`).join(', ')}].`)
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

export function debugPrintIndexedDBContent(content: IndexedDBContent) {
    const header = `~~~ IndexedDB ${content.db} v${content.version} ~~~`
    const separator = '~'.repeat(header.length)
    console.log(separator)
    console.log(header)
    console.log(separator)
    for (const columnFamily of SidelinesColumnFamilies) {
        console.log('~~~', columnFamily, '~~~')
        console.log(JSON.stringify(content.records[columnFamily], null, 4))
    }
}

function mapEncodedValue(v: EncodedValue): any {
    if (v === null) {
        return null
    }
    switch (typeof v) {
        case 'boolean':
        case 'number':
        case 'string':
        case 'undefined':
            return v
    }
    if ('a' in v && Array.isArray(v.a)) {
        return v.a.map(mapEncodedValue)
    } else if ('o' in v && Array.isArray(v.o)) {
        return Object.fromEntries(
            v.o.map(({ k, v }) => [k, mapEncodedValue(v)]),
        )
    } else if ('d' in v && typeof v.d === 'string') {
        return new Date(v.d)
    } else if ('v' in v) {
        return v.v
    } else {
        throw Error(JSON.stringify(v))
    }
}
