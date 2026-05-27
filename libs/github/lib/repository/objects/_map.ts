import type { QRepoObjectGraph } from '../../graphs.ts'
import type { RepoObject } from './types.api.ts'

export function mapRepoObject(
    path: string,
    object: QRepoObjectGraph['repository']['object'],
): RepoObject {
    switch (object.__typename) {
        case 'Tree':
            return {
                kind: 'tree',
                path,
                entries: object.entries.map(entry => {
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
