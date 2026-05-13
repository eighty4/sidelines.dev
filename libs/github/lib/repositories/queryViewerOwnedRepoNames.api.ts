import type { QViewerReposNamesGraph } from '../graphs.ts'
import { pageQueryWithVars } from '../pagingGraphqlQueries.ts'
import { QViewerReposNames, type QViewerReposNamesVars } from './gql.ts'

export default async function queryViewerOwnedRepoNames(
    ghToken: string,
    pageSize: number = 100,
): Promise<Array<string>> {
    return await pageQueryWithVars<
        QViewerReposNamesGraph,
        string,
        QViewerReposNamesVars
    >(
        ghToken,
        data => data.viewer.repositories.nodes.map(repoNode => repoNode.name),
        data => data.viewer.repositories.pageInfo,
        QViewerReposNames,
        cursor => ({ cursor, pageSize }),
    )
}
