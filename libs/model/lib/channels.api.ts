export type SidelinesChannelName =
    | SidelinesJobApiCN
    | SidelinesJobDataCN
    | SidelinesJobUpdateCN
    | SidelinesGitHubRateLimitCN
    | SidelinesWorkerLaunchCN

export type SidelinesGitHubRateLimitCN = 'sl.github.api.limit'

export type SidelinesJobApiCN = `sidelines.job.api.${string}.${string}`

export type SidelinesJobDataCN = `sl.job.data.${string}`

export type SidelinesJobUpdateCN = 'sl.job.worker.update'

export type SidelinesWorkerLaunchCN =
    | `sidelines.WorkerLaunch.page.${string}`
    | 'sidelines.WorkerLaunch.pages'
    | 'sidelines.WorkerLaunch.sharedWorker'

export function makeChannel(cn: SidelinesChannelName): BroadcastChannel {
    return new BroadcastChannel(cn)
}

export function makePostAndCloseChannel(
    cn: SidelinesChannelName,
    data: any,
): void {
    const channel = makeChannel(cn)
    channel.postMessage(data)
    channel.close()
}
