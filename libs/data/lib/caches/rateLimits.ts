import type { RateLimitState } from '@sidelines/github/rateLimits'
import { createJsonCache } from '../storage.ts'

export default createJsonCache<RateLimitState>(
    sessionStorage,
    'sl.gh.rate-limit',
)
