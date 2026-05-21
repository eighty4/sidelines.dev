import { GH_API_VERSION } from './apiVersion.ts'

// https://docs.github.com/en/rest/rate-limit/rate-limit
export type RateLimitedResource = 'code_search' | 'core' | 'graphql' | 'search'
// | 'integration_manifest'
// | 'source_import'
// | 'code_scanning_upload'
// | 'actions_runner_registration'
// | 'scim'
// | 'dependency_snapshots'
// | 'code_scanning_autofix'

export type RateLimit = {
    limit: number
    used: number
    remaining: number
    reset: number
}

export type RateLimitUpdate = RateLimit & {
    ratio: number
    resource: RateLimitedResource
}

type RateLimitResponse = {
    resources: Record<RateLimitedResource, RateLimit>
}

export async function debugGetRateLimit(
    ghToken: string,
): Promise<RateLimitResponse> {
    const request = await fetch('https://api.github.com/rate_limit', {
        headers: {
            authorization: 'Bearer ' + ghToken,
            accept: 'application/vnd.github+json',
            'x-github-api-version': GH_API_VERSION,
        },
    })
    return await request.json()
}

export function createChannel(): BroadcastChannel {
    return new BroadcastChannel('sl.github.api.limit')
}

const channel = createChannel()

export function dispatchRateLimitUpdate(headers: Headers) {
    const resource = headers.get('x-ratelimit-resource')
    if (!isRateLimitedResource(resource)) {
        return
    }
    const limit = parseNumerical(headers, 'x-ratelimit-limit')
    const remaining = parseNumerical(headers, 'x-ratelimit-remaining')
    const reset = parseNumerical(headers, 'x-ratelimit-reset')
    const used = parseNumerical(headers, 'x-ratelimit-used')
    if (
        limit === null ||
        remaining === null ||
        reset === null ||
        used === null
    ) {
        return
    }
    channel.postMessage({
        limit,
        remaining,
        reset,
        used,
        ratio: remaining / limit,
        resource,
    } satisfies RateLimitUpdate)
}

function isRateLimitedResource(
    resource: string | null,
): resource is RateLimitedResource {
    switch (resource) {
        case 'code_search':
        case 'core':
        case 'graphql':
        case 'search':
            return true
        default:
            return false
    }
}

function parseNumerical(headers: Headers, name: string): number | null {
    const s = headers.get(name)
    if (s) {
        const n = parseInt(s, 10)
        if (!isNaN(n)) {
            return n
        }
    }
    return null
}
