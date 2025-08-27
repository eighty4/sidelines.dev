import { getCookie, GH_TOKEN } from '@sidelines/data'
import { getUserLogin, UnauthorizedError } from '@sidelines/github'

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
        return await getUserLogin(token)
    } catch (e) {
        if (e instanceof UnauthorizedError) {
            return false
        } else {
            throw e
        }
    }
}
