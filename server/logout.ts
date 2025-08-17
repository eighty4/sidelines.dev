import { getCookie, GH_TOKEN } from '@sidelines/data'

export default (req: Request) => {
    const headers: Record<string, string> = {
        'Clear-Site-Data': '"storage"',
        Location: Bun.env.WEBAPP_ADDRESS!,
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
