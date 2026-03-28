import type { RepositoryId } from '@sidelines/model'
import { QRepoLatestTags, type QRepoLatestTagsVars } from './gql.ts'
import queryGraphqlApi from '../../queryGraphqlApi.ts'
import { NotFoundError } from '../../responses.ts'

export async function getLatestTags(
    ghToken: string,
    repo: RepositoryId,
    refQuery?: string,
): Promise<Array<string>> {
    const json = await queryGraphqlApi<QRepoLatestTagsVars, GraphData>(
        ghToken,
        QRepoLatestTags,
        {
            owner: repo.owner,
            name: repo.name,
            refQuery,
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
