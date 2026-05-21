import { dispatchRateLimitUpdate } from '#rateLimit'
import { GH_API_PRIOR_VERSION } from './apiVersion.ts'
import { NotFoundError, UnauthorizedError } from './responses.ts'

export default async function restPostForResponse(
    ghToken: string,
    url: `https://api.github.com/${string}`,
    body: any,
): Promise<Response> {
    const headers = new Headers({
        'content-Type': 'application/json',
        'x-gitHub-api-version': GH_API_PRIOR_VERSION,
    })
    if (ghToken) {
        headers.set('authorization', 'Bearer ' + ghToken)
    }
    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    })
    dispatchRateLimitUpdate(response.headers)
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
