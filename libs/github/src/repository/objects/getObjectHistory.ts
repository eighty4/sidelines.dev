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
    const query = `{
      viewer {
        repository(name: "${repo}") {
          ref(qualifiedName: "${branch}") {
            target {
              ... on Commit {
                history(first:${pageSize}, path: "${path}", after: ${!!cursor ? `"${cursor}"` : 'null'}) {
                  nodes {
                    oid
                    author {
                      name
                    }
                    message
                    authoredDate
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  totalCount
                }
              }
            }
          }
        }
      }
    }`
    const json = await queryGraphqlApi(ghToken, query, null)
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
