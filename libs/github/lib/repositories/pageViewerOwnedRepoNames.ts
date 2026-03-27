import { pageQueryWithVars } from '../paging.ts'
import { ViewerReposNames, type ViewerReposNamesVars } from './gql.ts'

export async function pageViewerOwnedRepoNames(
    ghToken: string,
    pageSize: number = 100,
): Promise<Array<string>> {
    return await pageQueryWithVars<GraphData, string, ViewerReposNamesVars>(
        ghToken,
        data => data.viewer.repositories.nodes.map(repoNode => repoNode.name),
        data => data.viewer.repositories.pageInfo,
        ViewerReposNames,
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
