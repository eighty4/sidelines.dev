import { dispatchRateLimitUpdate } from '#rateLimit'
import { GH_API_PRIOR_VERSION } from './apiVersion.ts'
import { UnauthorizedError } from './responses.ts'

export type GraphqlResponse<DATA> = {
    data: DATA
    errors: Array<{
        type: string
        path: Array<string>
        locations: Array<{ line: number; column: number }>
        message: string
    }>
}

export default async function queryGraphqlApi<VARS, DATA>(
    ghToken: string,
    query: string,
    variables: VARS,
    opts?: {
        signal?: AbortSignal
    },
): Promise<GraphqlResponse<DATA>> {
    const body = JSON.stringify(variables ? { query, variables } : { query })
    const headers = new Headers({
        'content-type': 'application/json',
        'x-github-api-version': GH_API_PRIOR_VERSION,
    })
    if (ghToken) {
        headers.set('authorization', 'Bearer ' + ghToken)
    }
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers,
        body,
        signal: opts?.signal,
    })
    dispatchRateLimitUpdate(response.headers)
    if (response.status === 401) {
        throw new UnauthorizedError('401 /graphql')
    }
    if (response.status === 403) {
        if (response.headers.get('x-ratelimit-remaining') === '0') {
            throw new Error('api rate limit reached')
        } else {
            throw new Error('forbidden')
        }
    }
    if (response.status !== 200) {
        console.error(await response.text())
        throw new Error('graphql http error')
    }
    return await response.json()
}
