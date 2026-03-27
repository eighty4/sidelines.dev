import type { RepositoryId } from '@sidelines/model'
import { RepoLatestTags, type RepoLatestTagsVars } from './gql.ts'
import { queryGraphqlApi } from '../../request.ts'
import { NotFoundError } from '../../responses.ts'

export async function getLatestTags(
    ghToken: string,
    repo: RepositoryId,
): Promise<Array<string>> {
    const json = await queryGraphqlApi<RepoLatestTagsVars, GraphData>(
        ghToken,
        RepoLatestTags,
        {
            ...repo,
        },
    )
    if (!json.data.repository) {
        throw new NotFoundError('repo')
    }
    if (!json.data.repository.refs.edges.length) {
        throw new NotFoundError('repo tags')
    }
    return json.data.repository.refs.edges.map(edge => edge.node.name)
}

type GraphData = {
    repository: {
        refs: {
            edges: Array<{
                node: {
                    name: string
                }
            }>
        }
    }
}
