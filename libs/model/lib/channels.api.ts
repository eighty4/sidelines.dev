import type { DataCallback } from './channels.ts'

export type SidelinesChannelName =
    | SidelinesJobApiCN
    | SidelinesJobDataCN
    | SidelinesJobUpdateCN
    | SidelinesGitHubRateLimitCN
    | SidelinesJobSyncRefsCN
    | SidelinesWorkerLaunchCN

// posted to after every github api response with rate limiting data
export type SidelinesGitHubRateLimitCN = 'sl.github.api.limit'

// api messages from jobs shared worker client to jobs shared worker
export type SidelinesJobApiCN = `sidelines.job.api.${string}.${string}`

export type SidelinesJobDataCN =
    | `sl.job.data.viewerRepos.${string}`
    | `sl.job.data.syncedRefsJobIds.req`
    | `sl.job.data.syncedRefsJobIds.res`

// how @sidelines/data/tx/syncedRefs launches syncedRefs jobs
export type SidelinesJobSyncRefsCN = 'sl.job.syncedRefs'

// job updates from job exec worker to jobs shared worker
export type SidelinesJobUpdateCN = 'sl.job.worker.update'

// negotiating page side dedicated worker launching
export type SidelinesWorkerLaunchCN =
    | `sidelines.WorkerLaunch.page.${string}`
    | 'sidelines.WorkerLaunch.pages'
    | 'sidelines.WorkerLaunch.sharedWorker'

export function makeChannel(cn: SidelinesChannelName): BroadcastChannel {
    return new BroadcastChannel(cn)
}

export function makeAwaitMessageAndCloseChannel<T>(
    cn: SidelinesChannelName,
): Promise<T> {
    return new Promise<T>(res => {
        const c = makeChannel(cn)
        c.onmessage = (e: MessageEvent<T>) => {
            c.onmessage = null
            c.close()
            res(e.data)
        }
    })
}

export function makeNeverCloseAndSubscribeChannel<T>(
    cn: SidelinesChannelName,
    cb: DataCallback<T>,
): void {
    const c = makeChannel(cn)
    c.onmessage = (e: MessageEvent<T>) => cb(e.data)
}

export function makePostAndCloseChannel(
    cn: SidelinesChannelName,
    data: any,
): void {
    const c = makeChannel(cn)
    c.postMessage(data)
    c.close()
}
