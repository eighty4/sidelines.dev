import { type FC, useEffect, useMemo, useState } from 'react'
import {
    rateLimitStateFromSession,
    rateLimitStateToSession,
} from '@sidelines/data/cache/rateLimits'
import {
    type RateLimitedResource,
    type RateLimitUpdate,
    subscribeToGitHubRateLimits,
} from '@sidelines/github/rateLimits'
import styles from './ActivityHub.module.css'

// todo notifications
// todo sync/job visibility
export const ActivityHub: FC = () => {
    return (
        <div className={styles.activityHub}>
            <CurrentActivity />
            <ApiMeter />
        </div>
    )
}

const CurrentActivity: FC = () => {
    return <div>nothing happening</div>
}

const ApiMeter: FC = () => {
    const initialState = useMemo(() => {
        const fromCache = rateLimitStateFromSession()
        if (fromCache?.graphql && Date.now() < fromCache.graphql.reset) {
            return fromCache.graphql
        } else {
            return null
        }
    }, [])
    const [state, setState] = useState<RateLimitUpdate | null>(initialState)
    const [mostDepleted, setMostDepleted] =
        useState<RateLimitedResource | null>()

    useEffect(() => {
        const sub = subscribeToGitHubRateLimits(onRateLimitUpdate)
        return () => sub.unsubscribe()
    }, [])

    function onRateLimitUpdate(update: RateLimitUpdate) {
        console.log('GitHub GraphQL rate limit update', update)
        if (update.resource !== 'graphql') {
            return
        }
        setState(update)
        rateLimitStateToSession({ graphql: update })
    }

    const ratio = state?.ratio || 1

    return (
        <div className={styles.apiMeter}>
            <div
                className={styles.indicator}
                style={{ '--api-meter-v': ratio }}
            ></div>
        </div>
    )
}
