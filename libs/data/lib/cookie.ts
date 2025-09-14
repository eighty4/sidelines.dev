export const GH_TOKEN = 'ght'

export function getCookie(cookieStr: string, name: string): string | null {
    if (cookieStr.length) {
        for (const cookie of cookieStr.split(';')) {
            const [key, value] = cookie.split('=')
            if (key.trim() === name) {
                return value.trim()
            }
        }
    }
    return null
}

export function getGhTokenCookie(cookieStr: string): string | null {
    return getCookie(cookieStr, GH_TOKEN)
}
