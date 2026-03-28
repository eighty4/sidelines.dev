import type { RepositoryObject } from '@sidelines/model'
import type { RepoObject } from './types.api.ts'

export function mapObject(path: string, object: any): RepoObject {
    switch (object.__typename) {
        case 'Tree':
            return {
                kind: 'tree',
                path,
                entries: object.entries.map((entry: any) => {
                    switch (entry.type) {
                        case 'tree':
                            return {
                                kind: 'tree',
                                name: entry.name,
                            }
                        case 'blob':
                            const { byteSize, isBinary } = entry.object
                            return {
                                kind: 'blob',
                                name: entry.name,
                                blob: { byteSize, isBinary },
                            }
                        default:
                            throw Error('unexpected')
                    }
                }),
            }
        case 'Blob':
            const { byteSize, isBinary } = object
            return {
                kind: 'blob',
                path,
                blob: { byteSize, isBinary },
            }
        case 'Commit':
            throw Error('unexpected commit')
        default:
            throw Error('unexpected')
    }
}

// sorts dirs on filename a-z, then files on filename a-z
export function sortRepositoryObjects(
    rc1: RepositoryObject,
    rc2: RepositoryObject,
): -1 | 0 | 1 {
    if (rc1.type === rc2.type) {
        const rc1n = rc1.name.toUpperCase()
        const rc2n = rc2.name.toUpperCase()
        if (rc1n === rc2n) {
            return 0
        } else if (rc1n < rc2n) {
            return -1
        } else {
            return 1
        }
    }
    return rc1.type === 'dir' ? -1 : 1
}
