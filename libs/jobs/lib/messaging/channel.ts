// posted to by job workers, and subscribed to by JobSWorker
export function createJobUpdateChannel(): BroadcastChannel {
    return new BroadcastChannel('sl.job.worker.update')
}
