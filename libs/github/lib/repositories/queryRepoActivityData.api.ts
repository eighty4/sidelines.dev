import { pageQueryWithVars } from '../pagingGraphqlQueries.ts'
import {
    QViewerReposActivityData,
    type QViewerReposActivityDataVars,
} from './gql.ts'

export type RepoActivityData = {
    name: string
    stargazerCount: number
    updatedAt: string
}

export async function queryRepoActivityData(
    ghToken: string,
): Promise<Array<RepoActivityData>> {
    const pageSize = 5
    return await pageQueryWithVars<
        GraphData,
        RepoActivityData,
        QViewerReposActivityDataVars
    >(
        ghToken,
        data => data.viewer.repositories.nodes,
        data => data.viewer.repositories.pageInfo,
        QViewerReposActivityData,
        cursor => ({ cursor, pageSize }),
    )
}

type GraphData = {
    viewer: {
        repositories: {
            nodes: Array<{
                name: string
                stargazerCount: number
                updatedAt: string
            }>
            pageInfo: {
                endCursor: string
                hasNextPage: boolean
            }
        }
    }
}
