import {
    ViewerRepoObjectHistory,
    type ViewerRepoObjectHistoryVars,
} from './gql.ts'
import type { Pageable } from '../../paging.ts'
import { queryGraphqlApi } from '../../request.ts'

export type ObjectHistory = {
    oid: string
    authorName: string
    message: string
    authoredDate: string
}

export async function getObjectHistory(
    ghToken: string,
    repo: string,
    branch: string,
    path: string,
    pageSize: number,
    cursor?: string,
): Promise<Pageable<ObjectHistory>> {
    const vars = {
        repo,
        branch,
        path,
        pageSize,
        cursor: cursor || `'null'`,
    }
    const json = await queryGraphqlApi<ViewerRepoObjectHistoryVars, GraphData>(
        ghToken,
        ViewerRepoObjectHistory,
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
        data: nodes.map((node: any) => {
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
                        nodes: Array<{
                            oid: string
                            author: {
                                name: string
                            }
                            message: string
                            authoredDate: string
                        }>
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
