import { queryGraphqlApi } from './request.ts'

// reusable type for pageable query responses
export type Pageable<T> = {
    data: Array<T>
    pageInfo: {
        endCursor: string
        hasNextPage: boolean
    }
    totalCount: number
}

// package internal API for collecting all paged query results
export async function pageQueryWithVars<GRAPH_DATA, EXTRACTED_DATA, VARS>(
    ghToken: string,
    extractData: (data: GRAPH_DATA) => Array<EXTRACTED_DATA>,
    extractPageInfo: (data: GRAPH_DATA) => Pageable<any>['pageInfo'],
    query: string,
    varsBuilder: (cursor: string) => VARS,
): Promise<Array<EXTRACTED_DATA>> {
    let cursor = `'null'`
    let hasNextPage = true
    const results: Array<EXTRACTED_DATA> = []

    while (hasNextPage) {
        const json = await queryGraphqlApi<VARS, GRAPH_DATA>(
            ghToken,
            query,
            varsBuilder(cursor),
        )
        results.push(...extractData(json.data))
        const pageInfo = extractPageInfo(json.data)
        cursor = pageInfo.endCursor
        hasNextPage = pageInfo.hasNextPage
    }

    return results
}
