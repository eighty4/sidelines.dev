export function createChannel(): BroadcastChannel {
    return new BroadcastChannel('sidelines.notify')
}
