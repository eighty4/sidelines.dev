declare let self: SharedWorkerGlobalScope

const WS_EVENTS_PATH = '/api/events'

console.log('on created', Date.now())

const ports: Array<MessagePort> = []
let webSocket: WebSocket

self.onconnect = (e: MessageEvent) => {
    if (typeof webSocket === 'undefined') {
        webSocket = createWebSocket()
    }
    console.log('on connect', Date.now())
    if (e.ports.length > 1) {
        throw Error('that was unexpected')
    }
    const [port] = e.ports
    port.onmessage = (e: MessageEvent<string>) => {
        console.log(e.data)
    }
    ports.push(port)
}

function webSocketURL() {
    if (location.host === 'sidelines.dev') {
        return 'wss://sidelines.dev' + WS_EVENTS_PATH
    } else {
        return `ws://${location.host}${WS_EVENTS_PATH}`
    }
}

function createWebSocket(): WebSocket {
    const ws = new WebSocket(webSocketURL())
    ws.onopen = () => console.log('ws open')
    ws.onmessage = (e: MessageEvent) => console.log('ws msg', e.data)
    ws.onerror = e => console.error('what the funyons', e)
    return ws
}

// todo serialize a worker request to send to a message port
//  send worker request to every connected port
//  the first port to respond is selected to perform task
// type PortDedicatedWorkerRequest = {}
