import {
    NotFoundError,
    UnauthorizedError,
    type GraphqlResponse,
} from './responses.ts'

export async function queryGraphqlApi<VARS, DATA>(
    ghToken: string,
    query: string,
    variables: VARS,
    opts?: {
        signal?: AbortSignal
    },
): Promise<GraphqlResponse<DATA>> {
    const body = JSON.stringify(variables ? { query, variables } : { query })
    const headers = new Headers({
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
    })
    if (ghToken) {
        headers.set('Authorization', 'Bearer ' + ghToken)
    }
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers,
        body,
        signal: opts?.signal,
    })
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

export async function restGetJson(ghToken: string, url: string): Promise<any> {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + ghToken,
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    })
    if (response.status === 401) {
        throw new UnauthorizedError('401 ' + url)
    }
    if (response.status === 403) {
        if (response.headers.get('x-ratelimit-remaining') === '0') {
            throw new Error('api rate limit reached')
        } else {
            throw new Error('forbidden')
        }
    }
    if (response.status === 404) {
        throw new NotFoundError()
    }
    return await response.json()
}

export async function restPostForJson(
    ghToken: string,
    url: string,
    body: any,
): Promise<any> {
    const response = await restPostForResponse(ghToken, url, body)
    return await response.json()
}

export async function restPostForResponse(
    ghToken: string,
    url: string,
    body: any,
): Promise<Response> {
    const headers = new Headers({
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
    })
    if (ghToken) {
        headers.set('Authorization', 'Bearer ' + ghToken)
    }
    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    })
    if (response.status === 401) {
        throw new UnauthorizedError('401 ' + url)
    }
    if (response.status === 403) {
        if (response.headers.get('x-ratelimit-remaining') === '0') {
            throw new Error('api rate limit reached')
        } else {
            throw new Error('forbidden')
        }
    }
    if (response.status === 404) {
        throw new NotFoundError()
    }
    if (response.status === 500) {
        throw new Error(await response.text())
    }
    return response
}
