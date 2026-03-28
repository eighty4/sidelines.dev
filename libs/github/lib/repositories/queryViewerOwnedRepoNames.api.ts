import { pageQueryWithVars } from '../pagingGraphqlQueries.ts'
import { QViewerReposNames, type QViewerReposNamesVars } from './gql.ts'

export default async function queryViewerOwnedRepoNames(
    ghToken: string,
    pageSize: number = 100,
): Promise<Array<string>> {
    return await pageQueryWithVars<GraphData, string, QViewerReposNamesVars>(
        ghToken,
        data => data.viewer.repositories.nodes.map(repoNode => repoNode.name),
        data => data.viewer.repositories.pageInfo,
        QViewerReposNames,
        cursor => ({ cursor, pageSize }),
    )
}

type GraphData = {
    viewer: {
        repositories: {
            nodes: Array<{
                name: string
                owner: {
                    login: string
                }
            }>
            pageInfo: {
                endCursor: string
                hasNextPage: boolean
            }
        }
    }
}
