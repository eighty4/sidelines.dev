import { createCache, getCookie, GH_TOKEN } from '@sidelines/data/web'
import { getUserLogin, UnauthorizedError } from '@sidelines/github'

const ghLoginCache = createCache(sessionStorage, 'sld.user.gh.login')

export function expectGhToken(): string {
    const ghToken = getCookie(document.cookie, GH_TOKEN)
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
