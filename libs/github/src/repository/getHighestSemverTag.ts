import type { RepositoryId } from '@sidelines/model'
import { queryGraphqlApi } from '../request.ts'

export async function getHighestSemverTag(
    ghToken: string | null,
    repo: RepositoryId,
    // for monorepo package tags where path to package prefixes tag name
    // tagPrefix example for a golang module in a subdirectory:
    //  `refs/tags/packages/my-pkg/v0.0.0` would be `packages/my-pkg/`
    tagPrefix?: string | null,
): Promise<string | 'repo-not-found' | 'tag-not-found'> {
    const query = `{ repository(owner: "${repo.owner}", name: "${repo.name}") { refs( query: "${tagPrefix ? tagPrefix : ''}v" refPrefix: "refs/tags/" last: 1 ) { edges { node { name } } } } }`
    const json = await queryGraphqlApi(ghToken, query, null)
    if (!json.data.repository) {
        return 'repo-not-found'
    }
    if (!json.data.repository.refs.edges.length) {
        return 'tag-not-found'
    }
    return json.data.repository.refs.edges[0].node.name
}
