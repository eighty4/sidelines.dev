import { getCookie, GH_TOKEN } from '@sidelines/data/cookie'
import type { ServerEnv } from './routes.ts'

export function createLogoutRoute(env: ServerEnv) {
    return (req: Request) => {
        const headers: Record<string, string> = {
            // 'Clear-Site-Data': '"cookies", "storage"',
            Location: env.WEBAPP_ADDRESS!,
        }
        if (hasAuthCookie(req)) {
            headers['Set-Cookie'] =
                `${GH_TOKEN}=; Secure; SameSite=Strict; Path=/; Max-Age=0`
        }
        return new Response('Found', {
            status: 302,
            headers,
        })
    }
}

function hasAuthCookie(req: Request) {
    const cookie = req.headers.get('cookie')
    if (cookie) {
        if (getCookie(cookie, GH_TOKEN)) {
            return true
        }
    }
    return false
}
