import {
    ghLoginFromSession,
    ghLoginToSession,
} from '@sidelines/data/cache/ghLogin'
import {
    ghTokenFromSession,
    ghTokenToSession,
} from '@sidelines/data/cache/ghToken'
import { ghTokenFromCookie } from '@sidelines/data/cookie'
import { UnauthorizedError } from '@sidelines/github'
import { queryUserLogin } from '@sidelines/github/user/queryUserLogin'

export function lookupGhToken(): string | null {
    const fromSession = ghTokenFromSession()
    if (fromSession) {
        return fromSession
    }
    const fromCookie = ghTokenFromCookie(document.cookie)
    if (fromCookie) {
        ghTokenToSession(fromCookie)
    }
    return fromCookie
}

export function expectGhToken(): string {
    const ghToken = lookupGhToken()
    if (ghToken === null) {
        console.log('expected gh token cookie, throwing unauthorized')
        throw new UnauthorizedError('missing token')
    } else {
        return ghToken
    }
}

export async function expectGhLogin(ghToken: string): Promise<string> {
    let ghLogin = ghLoginFromSession()
    if (ghLogin === null) {
        console.log('expected gh login session state, fetching from gh graphql')
        ghLogin = await queryUserLogin(ghToken)
        ghLoginToSession(ghLogin)
    }
    return ghLogin
}
