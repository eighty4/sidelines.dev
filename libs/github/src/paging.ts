import { queryGraphqlApi } from './request.ts'

// package internal API for collecting all paged query results
export async function collectPagedQueryResults(
    ghToken: string,
    resultsPerPage: number,
    queryBuilder: (pagingParams: string) => string,
    resultCollector: (result: any) => Array<any>,
    pageInfoCollector: (result: any) => {
        endCursor: string
        hasNextPage: boolean
    },
): Promise<Array<any>> {
    let cursor = null
    let hasNextPage = true
    const results = []

    while (hasNextPage) {
        const query = queryBuilder(
            `first: ${resultsPerPage}, after: ${cursor ? `"${cursor}"` : 'null'},`,
        )
        const json = await queryGraphqlApi(ghToken, query, null)
        results.push(...resultCollector(json))
        const pageInfo = pageInfoCollector(json)
        cursor = pageInfo.endCursor
        hasNextPage = pageInfo.hasNextPage
    }

    return results
}

// reusable type for pageable query responses
export type Pageable<T> = {
    data: Array<T>
    pageInfo: {
        endCursor: string
        hasNextPage: boolean
    }
    totalCount: number
}
