const KEY = 'sl.gh.token'

export function ghTokenFromSession(): string | null {
    return sessionStorage.getItem(KEY)
}

export function ghTokenToSession(ghToken: string) {
    sessionStorage.setItem(KEY, ghToken)
}
