const KEY = 'sl.gh.login'

export function ghLoginFromSession(): string | null {
    return sessionStorage.getItem(KEY)
}

export function ghLoginToSession(ghLogin: string) {
    sessionStorage.setItem(KEY, ghLogin)
}
