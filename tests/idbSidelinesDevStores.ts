import * as OBJECT_STORES_EXPORTS from '@sidelines/data/STORES'

const OBJECT_STORES: Record<
    string,
    {
        keyPath: Array<string> | string
        indices: Record<string, { keyPath: Array<string> | string }>
    }
> = (() =>
    Object.fromEntries(
        Object.keys(OBJECT_STORES_EXPORTS)
            .filter(isStoreExport)
            .map(k => [
                objectStoreOrIndexName(k),
                {
                    keyPath: keyPath(k),
                    indices: indices(k),
                },
            ]),
    ))()

export function forTestingGetObjectStoreNames(): Array<string> {
    return Object.keys(OBJECT_STORES)
}

export function keyPathForObjectStore(
    objectStore: string,
): Array<string> | string {
    return OBJECT_STORES[objectStore].keyPath
}

export function indicesForObjectStore(objectStore: string): Array<string> {
    return Object.keys(OBJECT_STORES[objectStore].indices)
}

export function keyPathForIndex(
    objectStore: string,
    index: string,
): Array<string> | string {
    return OBJECT_STORES[objectStore].indices[index].keyPath
}

function isStoreExport(name: string): name is `DB_STORE_${string}` {
    return name.startsWith('DB_STORE_') && !name.endsWith('_KEY')
}

function isIndexExport(
    name: string,
    prefix: string,
): name is `DB_INDEX_${string}` {
    return name.startsWith(prefix) && !name.endsWith('_KEY')
}

function objectStoreOrIndexName(
    objectStoreExport: `DB_STORE_${string}` | `DB_INDEX_${string}`,
): string {
    const name =
        OBJECT_STORES_EXPORTS[
            objectStoreExport as keyof typeof OBJECT_STORES_EXPORTS
        ]
    if (typeof name === 'string') {
        return name
    } else {
        throw TypeError()
    }
}

function indices(
    objectStoreExport: `DB_STORE_${string}`,
): Record<string, { keyPath: Array<string> | string }> {
    const indexMatch = objectStoreExport.replace('DB_STORE_', 'DB_INDEX_')
    return Object.fromEntries(
        Object.keys(OBJECT_STORES_EXPORTS)
            .filter(k => isIndexExport(k, indexMatch))
            .map(k => {
                return [
                    objectStoreOrIndexName(k),
                    {
                        keyPath: keyPath(k),
                    },
                ]
            }),
    )
}

function keyPath(
    exportName: `DB_STORE_${string}` | `DB_INDEX_${string}`,
): Array<string> | string {
    const keyPath =
        OBJECT_STORES_EXPORTS[
            `${exportName}_KEY` as keyof typeof OBJECT_STORES_EXPORTS
        ]
    if (typeof keyPath === 'string' || Array.isArray(keyPath)) {
        return keyPath
    } else {
        throw TypeError()
    }
}
