import { getCookie, GH_TOKEN } from '@sidelines/data'
import type { ServerEnv } from './routes.ts'

export function createLogoutRoute(env: ServerEnv) {
    return (req: Request) => {
        const headers: Record<string, string> = {
            'Clear-Site-Data': '"storage"',
            Location: env.WEBAPP_ADDRESS!,
        }
        const cookie = req.headers.get('cookie')
        if (cookie) {
            const ghToken = getCookie(cookie, GH_TOKEN)
            if (ghToken) {
                headers['Set-Cookie'] =
                    `${GH_TOKEN}=${ghToken}; Secure; SameSite=Strict; Path=/; Max-Age=0`
            }
        }
        return new Response('Found', {
            status: 302,
            headers,
        })
    }
}
