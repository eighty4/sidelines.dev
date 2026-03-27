import { pageQueryWithVars } from '../paging.ts'
import {
    ViewerReposActivityData,
    type ViewerReposActivityDataVars,
} from './gql.ts'

export type RepoActivityData = {
    name: string
    stargazerCount: number
    updatedAt: string
}

export async function collectRepoActivityData(
    ghToken: string,
): Promise<Array<RepoActivityData>> {
    const pageSize = 5
    return await pageQueryWithVars<
        GraphData,
        RepoActivityData,
        ViewerReposActivityDataVars
    >(
        ghToken,
        data => data.viewer.repositories.nodes,
        data => data.viewer.repositories.pageInfo,
        ViewerReposActivityData,
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
