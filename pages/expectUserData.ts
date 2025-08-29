import { getCookie, GH_TOKEN } from '@sidelines/data/web'
import { UnauthorizedError } from '@sidelines/github'
import { expectGhLogin } from '@sidelines/pageload'
import { UserDataClient } from '../workers/UserDataClient.ts'

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
