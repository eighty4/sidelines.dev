import { createCache, getCookie, GH_TOKEN } from '@sidelines/data/web'
import { getUserLogin, UnauthorizedError } from '@sidelines/github'
import { UserDataClient } from '../workers/UserDataClient.ts'

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

export async function expectUserDataClient(): Promise<UserDataClient> {
    const userData = await getUserDataClient()
    if (userData === null) {
        throw new UnauthorizedError('missing token')
    } else {
        return userData
    }
}

export async function getUserDataClient(): Promise<UserDataClient | null> {
    const ghToken = getCookie(document.cookie, GH_TOKEN)
    if (ghToken === null) {
        return null
    }
    let ghLogin = ghLoginCache.read()
    if (ghLogin === null) {
        ghLoginCache.write((ghLogin = await getUserLogin(ghToken)))
    }
    return new UserDataClient(ghToken, ghLogin)
}
