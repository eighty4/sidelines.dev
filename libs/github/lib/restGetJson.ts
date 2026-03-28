import { NotFoundError, UnauthorizedError } from './responses.ts'

export default async function restGetJson(
    ghToken: string,
    url: string,
): Promise<any> {
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
