import { collectPagedQueryResults } from '../paging.ts'

export type RepositoryRelevanceData = {
    name: string
    stargazerCount: number
    updatedAt: string
}

export async function listRepositoriesForActivityRelevance(
    ghToken: string,
): Promise<Array<RepositoryRelevanceData>> {
    const reposPerPage = 5
    return await collectPagedQueryResults(
        ghToken,
        reposPerPage,
        pagingParams => `{
      viewer {
        repositories(
          ${pagingParams},
          affiliations: [OWNER]
        ) {
          nodes {
            ... on Repository {
              name
              stargazerCount
              updatedAt
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }`,
        result => {
            return result.data.viewer.repositories.nodes
        },
        result => {
            return result.data.viewer.repositories.pageInfo
        },
    )
}
