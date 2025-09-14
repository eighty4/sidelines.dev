import { createChannel } from './channel.ts'
import type { SidelinesNotification } from './notifications.ts'

export type * from './notifications.ts'

type NotifyCallback = (notificaiton: SidelinesNotification) => void

type NotifySubscription = {
    unsubscribe: () => void
}

const subscriptions: Array<NotifyCallback> = []

function broadcast(e: MessageEvent) {
    console.log(e.data)
    for (const cb of subscriptions) {
        cb(e.data)
    }
}

let channel: BroadcastChannel | null = null

export function listenForNotifications(cb: NotifyCallback): NotifySubscription {
    if (!channel) {
        channel = createChannel()
        channel.onmessage = broadcast
    }
    subscriptions.push(cb)
    return {
        unsubscribe: () => {
            subscriptions.splice(subscriptions.indexOf(cb), 1)
            if (!subscriptions.length && channel !== null) {
                channel.close()
                channel.onmessage = null
                channel = null
            }
        },
    }
}
