import { getCookie, GH_TOKEN } from '@sidelines/data/cookie'
import { UnauthorizedError } from '@sidelines/github'
import { queryUserLogin } from '@sidelines/github/user/queryUserLogin'

export async function authorizedRequest(req: Request): Promise<false | string> {
    const cookie = req.headers.get('cookie')
    if (!cookie) {
        return false
    }
    const token = getCookie(cookie, GH_TOKEN)
    if (!token) {
        return false
    }
    try {
        return await queryUserLogin(token)
    } catch (e) {
        if (e instanceof UnauthorizedError) {
            return false
        } else {
            throw e
        }
    }
}
