import type { ServerWebSocket, WebSocketHandler } from 'bun'

// https://docs.github.com/en/webhooks/webhook-events-and-payloads

export const WS_EVENTS_PATH = '/api/events'

export class EventWebSockets implements WebSocketHandler {
    message(_ws: ServerWebSocket, message: string | Buffer) {
        console.log('msg', message)
    }

    open(_ws: ServerWebSocket) {
        console.log('ws open')
    }

    close(_ws: ServerWebSocket, code: number, message: string | Buffer) {
        console.log('ws close', code, message)
    }

    drain(_ws: ServerWebSocket) {
        console.log('ws drain')
    }
}
