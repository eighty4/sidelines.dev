import { onUnauthorized } from './responses.ts'

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
        const response = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + ghToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: queryBuilder(
                    `first: ${resultsPerPage}, after: ${cursor ? `"${cursor}"` : 'null'},`,
                ),
            }),
        })
        if (response.status === 401) {
            onUnauthorized()
        }
        const json = await response.json()
        results.push(...resultCollector(json))
        const pageInfo = pageInfoCollector(json)
        cursor = pageInfo.endCursor
        hasNextPage = pageInfo.hasNextPage
    }

    return results
}

// reusable type for pageable APIs
export type Pageable<T> = {
    data: Array<T>
    pageInfo: {
        endCursor: string
        hasNextPage: boolean
    }
    totalCount: number
}
