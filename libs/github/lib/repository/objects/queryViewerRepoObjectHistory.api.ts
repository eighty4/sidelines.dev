import {
    QViewerRepoObjectHistory,
    type QViewerRepoObjectHistoryVars,
} from './gql.ts'
import type { RepoObjectHistory } from './types.api.ts'
import type { Pageable } from '../../pagingGraphqlQueries.ts'
import queryGraphqlApi from '../../queryGraphqlApi.ts'

export default async function queryViewerRepoObjectHistory(
    ghToken: string,
    repo: string,
    branch: string,
    path: string,
    pageSize: number,
    cursor?: string,
): Promise<Pageable<RepoObjectHistory>> {
    const vars = {
        repo,
        branch,
        path,
        pageSize,
        cursor: cursor || `'null'`,
    }
    const json = await queryGraphqlApi<QViewerRepoObjectHistoryVars, GraphData>(
        ghToken,
        QViewerRepoObjectHistory,
        vars,
    )
    if (!json.data.viewer.repository?.ref?.target?.history) {
        throw new Error(
            `repo ${repo} branch ${branch} path ${path} object history not found`,
        )
    }
    const { nodes, totalCount, pageInfo } =
        json.data.viewer.repository.ref.target.history
    return {
        totalCount,
        pageInfo: {
            hasNextPage: pageInfo.hasNextPage,
            endCursor: pageInfo.endCursor,
        },
        data: nodes.map((node: HistoryNodeGraphData) => {
            return {
                oid: node.oid,
                authorName: node.author.name,
                message: node.message,
                authoredDate: node.authoredDate,
            }
        }),
    }
}

type GraphData = {
    viewer: {
        repository: null | {
            ref: null | {
                target: null | {
                    history: null | {
                        nodes: Array<HistoryNodeGraphData>
                        totalCount: number
                        pageInfo: {
                            hasNextPage: boolean
                            endCursor: string
                        }
                    }
                }
            }
        }
    }
}

type HistoryNodeGraphData = {
    oid: string
    author: {
        name: string
    }
    message: string
    authoredDate: string
}
