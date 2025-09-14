import { getGhTokenCookie } from '@sidelines/data/cookie'
import { createCache } from '@sidelines/data/storage'
import { getUserLogin, UnauthorizedError } from '@sidelines/github'

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
        ghLoginCache.write((ghLogin = await getUserLogin(ghToken)))
    }
    return ghLogin
}
