export function getCookie(cookieStr: string, name: string): string | undefined {
  if (cookieStr.length) {
    for (const cookie of cookieStr.split(';')) {
      const [key, value] = cookie.split('=')
      if (key.trim() === name) {
        return value.trim()
      }
    }
  }
}
