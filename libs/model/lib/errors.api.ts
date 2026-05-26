export const Network = 'net-fail'

export const RepoNotFound = 'oper-nf'

export const RefNotFound = 'fer-nf'

export const Timeout = 'timeout'

// when Network is followed by nothing in local cache
export const Unavailable = 'nvlbl'

export function isFetchFailed(e: unknown): boolean {
    if (e !== null && e instanceof TypeError) {
        switch (e.message) {
            // chromium
            case 'Failed to fetch':
            // webkit
            case 'Load failed':
            // firefox
            case 'NetworkError when attempting to fetch resource.':
                return true
        }
    }
    return false
}
