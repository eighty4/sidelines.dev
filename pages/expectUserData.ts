import { getCookie, GH_TOKEN } from '@sidelines/data/cookie'
import { UnauthorizedError } from '@sidelines/github'
import { expectGhLogin } from '@sidelines/pageload/session'
import { UserDataClient } from 'Sidelines.dev/workers/userData/UserDataClient'

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
    const ghLogin = await expectGhLogin(ghToken)
    return new UserDataClient(ghToken, ghLogin)
}
