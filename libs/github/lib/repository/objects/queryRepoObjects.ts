import type { RepositoryId } from '@sidelines/model'
import { QueryRepoObjects, type QueryRepoObjectsVars } from './gql.ts'
import { queryGraphqlApi } from '../../request.ts'

export type RepoObject =
    | {
          kind: 'blob'
          path?: string
          blob: BlobInfo
      }
    | {
          kind: 'tree'
          path?: string
          entries: Array<TreeEntryInfo>
      }

// blob or tree entries within a tree object
export type TreeEntryInfo =
    | {
          kind: 'tree'
          name: string
      }
    | {
          kind: 'blob'
          name: string
          blob: BlobInfo
      }

export type BlobInfo = {
    byteSize: number
    isBinary: boolean
}

// repo obj query where obj expr is expected to return a blob or tree
export async function queryRepoObject(
    ghToken: string,
    repo: RepositoryId,
    path: string | null,
    opts?: {
        signal?: AbortSignal
    },
): Promise<RepoObject | 'repo-not-found'> {
    path = path || ''
    const json = await queryGraphqlApi<QueryRepoObjectsVars, any>(
        ghToken,
        QueryRepoObjects,
        { owner: repo.owner, name: repo.name, objExpr: `HEAD:${path || ''}` },
        opts,
    )
    if (!json.data.repository) {
        return 'repo-not-found'
    }
    return mapObject(path, json.data.repository.object)
}

// combines multiple queries for repo objects expected to be blobs and trees
// useful for UIs that recursively retireve repo dirs
export async function queryMultipleRepoObjects(
    ghToken: string,
    repo: RepositoryId,
    paths: Array<string>,
    opts?: {
        signal?: AbortSignal
    },
): Promise<Record<string, RepoObject | 'object-not-found'> | 'repo-not-found'> {
    const objectQs = paths.map(
        (p, i) =>
            `obj${i}: object(expression: "HEAD:${p}") { __typename ... on Blob { byteSize isBinary } ... on Tree { entries { name type object { ... on Blob { byteSize isBinary } } } } }`,
    )
    const query = `query QueryMultipleRepoObjects($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${objectQs.join(' ')} } }`
    const json = await queryGraphqlApi<RepositoryId, any>(
        ghToken,
        query,
        repo,
        opts,
    )
    if (!json.data.repository) {
        return 'repo-not-found'
    }
    const result: Record<string, RepoObject | 'object-not-found'> = {}
    for (let i = 0; i < paths.length; i++) {
        result[paths[i]] = mapObject(paths[i], json.data.repository['obj' + i])
    }
    return result
}

function mapObject(path: string, object: any): RepoObject {
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
