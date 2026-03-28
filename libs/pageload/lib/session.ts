import { getGhTokenCookie } from '@sidelines/data/cookie'
import { createCache } from '@sidelines/data/storage'
import { UnauthorizedError } from '@sidelines/github'
import { queryUserLogin } from '@sidelines/github/user/queryUserLogin'

const ghLoginCache = createCache(sessionStorage, 'sld.user.gh.login')

export function expectGhToken(): string {
    const ghToken = getGhTokenCookie(document.cookie)
    if (ghToken === null) {
        throw new UnauthorizedError('missing token')
    } else {
        return ghToken
    }
}

export async function expectGhLogin(ghToken: string): Promise<string> {
    let ghLogin = ghLoginCache.read()
    if (ghLogin === null) {
        ghLoginCache.write((ghLogin = await queryUserLogin(ghToken)))
    }
    return ghLogin
}
