import { getGhTokenCookie } from '@sidelines/data/cookie'
import { createCache } from '@sidelines/data/storage'
import { UnauthorizedError } from '@sidelines/github'
import { queryUserLogin } from '@sidelines/github/user/queryUserLogin'

const ghLoginCache = createCache(sessionStorage, 'sld.user.gh.login')

export function expectGhToken(): string {
    const ghToken = getGhTokenCookie(document.cookie)
    if (ghToken === null) {
        console.log('expected gh token cookie, throwing unauthorized')
        throw new UnauthorizedError('missing token')
    } else {
        return ghToken
    }
}

export async function expectGhLogin(ghToken: string): Promise<string> {
    let ghLogin = ghLoginCache.read()
    if (ghLogin === null) {
        console.log('expected gh login session state, fetching from gh graphql')
        ghLoginCache.write((ghLogin = await queryUserLogin(ghToken)))
    }
    return ghLogin
}
