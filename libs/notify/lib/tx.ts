import { createChannel } from './channel.ts'
import type { SidelinesNotification } from './notifications.ts'

export type * from './notifications.ts'

let channel: BroadcastChannel

export function notify(notification: SidelinesNotification) {
    if (!channel) {
        channel = createChannel()
    }
    channel.postMessage(notification)
}
