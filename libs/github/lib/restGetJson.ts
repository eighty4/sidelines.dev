import { dispatchRateLimitUpdate } from '#rateLimit'
import { GH_API_PRIOR_VERSION } from './apiVersion.ts'
import { NotFoundError, UnauthorizedError } from './responses.ts'

export default async function restGetJson(
    ghToken: string,
    url: `https://api.github.com/${string}`,
): Promise<any> {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            authorization: 'Bearer ' + ghToken,
            'content-type': 'application/json',
            'x-gitHub-api-version': GH_API_PRIOR_VERSION,
        },
    })
    dispatchRateLimitUpdate(response.headers)
    switch (response.status) {
        case 401:
            throw new UnauthorizedError('401 ' + url)
        case 403:
            if (response.headers.get('x-ratelimit-remaining') === '0') {
                throw new Error('api rate limit reached')
            } else {
                throw new Error('forbidden')
            }
        case 404:
            throw new NotFoundError()
        case 500:
            throw new Error(await response.text())
        default:
            return await response.json()
    }
}
