import { NotFoundError, UnauthorizedError } from './responses.ts'

export default async function restPostForResponse(
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
