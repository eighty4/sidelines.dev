import type { RepositoryId } from '@sidelines/model'
import { mapObject } from './_queryRepoObjects.ts'
import type { RepoObject } from './types.api.ts'
import queryGraphqlApi from '../../queryGraphqlApi.ts'

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
