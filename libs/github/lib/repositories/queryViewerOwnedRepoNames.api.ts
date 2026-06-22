import type { RepoNameWithOwner } from '@sidelines/model'
import type { QViewerReposNamesGraph } from '../graphs.ts'
import { pageQueryWithVars } from '../pagingGraphqlQueries.ts'
import { QViewerReposNames, type QViewerReposNamesVars } from './gql.ts'

export default async function queryViewerOwnedRepoNames(
    ghToken: string,
    pageSize: number = 100,
): Promise<Array<RepoNameWithOwner>> {
    return await pageQueryWithVars<
        QViewerReposNamesGraph,
        RepoNameWithOwner,
        QViewerReposNamesVars
    >(
        ghToken,
        data =>
            data.viewer.repositories.nodes.map<RepoNameWithOwner>(
                repoNode => `${data.viewer.login}/${repoNode.name}`,
            ),
        data => data.viewer.repositories.pageInfo,
        QViewerReposNames,
        cursor => ({ cursor, pageSize }),
    )
}
