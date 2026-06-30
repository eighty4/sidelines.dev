declare const self: DedicatedWorkerGlobalScope

// todo move to @sidelines/model for other workers
export function workerLabel(): string {
    return self.location.pathname.split('/').slice(-4, -1).join('/')
}
