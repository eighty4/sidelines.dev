import type { RateLimitState } from '@sidelines/github/rateLimits'

const KEY = 'sl.gh.rate-limit'

export function rateLimitStateToSession(state: RateLimitState) {
    sessionStorage.setItem(KEY, JSON.stringify(state))
}

export function rateLimitStateFromSession(): RateLimitState | null {
    const fromJson = sessionStorage.getItem(KEY)
    if (fromJson) {
        return JSON.parse(fromJson)
    } else {
        return null
    }
}
