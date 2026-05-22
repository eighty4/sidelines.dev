import {
    ChannelDataSubscription,
    type DataSubscription,
} from '@sidelines/model'
import {
    createChannel,
    type RateLimitedResource,
    type RateLimitUpdate,
} from './rateLimit.ts'

export {
    debugGetRateLimit,
    type RateLimitedResource,
    type RateLimitUpdate,
} from './rateLimit.ts'

export type RateLimitState = Partial<
    Record<RateLimitedResource, RateLimitUpdate>
>

// todo dispatchRateLimitUpdate maintains state with setTimeout on reset timestamp and merges updates from all resource types
export function subscribeToGitHubRateLimits(
    cb: (update: RateLimitUpdate) => void,
): DataSubscription {
    return new ChannelDataSubscription(createChannel(), cb)
}
