import {
    createServer,
    type IncomingHttpHeaders,
    type IncomingMessage,
    type OutgoingHttpHeaders,
    type ServerResponse,
} from 'node:http'
import {
    createRoutes,
    hasServerEnvValues,
    type HttpMethod,
    type RequestHandler,
} from '@sidelines/server/routes'

const PORT = 3333

createWebServer().listen(PORT, () => {
    console.log('sidelines.dev api routes running on port', PORT)
})

export function createWebServer(): ReturnType<typeof createServer> {
    if (!hasServerEnvValues(process.env)) {
        throw Error('missing env vars for web server')
    }
    const routes = createRoutes(process.env)
    return createServer((req: IncomingMessage, res: ServerResponse) => {
        if (!req.url || !req.method) {
            res.end()
        } else {
            const url = new URL(`${process.env.WEBAPP_ADDRESS}${req.url}`)
            if (!url.pathname.startsWith('/assets/sidelines/icons/'))
                console.log(req.method, url.pathname)
            if (routes[url.pathname]) {
                const route = routes[url.pathname][req.method as HttpMethod]
                if (!route) {
                    res.writeHead(405)
                    res.end()
                } else {
                    invokeRoute(url, req, res, route)
                }
            } else if (req.method !== 'GET') {
                res.writeHead(405)
                res.end()
            } else {
                res.writeHead(404)
                res.end()
            }
        }
    })
}

function invokeRoute(
    url: URL,
    req: IncomingMessage,
    res: ServerResponse,
    route: RequestHandler,
) {
    const result = route(
        new Request(url, {
            method: req.method,
            headers: convertHeadersToFetch(req.headers),
        }),
    )
    if (result instanceof Response) {
        sendFetchResponse(result, res)
    } else if (result instanceof Promise) {
        result.then(fetchResponse => sendFetchResponse(fetchResponse, res))
    } else {
        console.error('route did not return a Response or Promise<Response>')
        res.end()
    }
}

function sendFetchResponse(
    fetchResponse: Response,
    serverResponse: ServerResponse,
) {
    serverResponse.writeHead(
        fetchResponse.status,
        convertHeadersFromFetch(fetchResponse.headers),
    )
    if (fetchResponse.body) {
        fetchResponse.text().then(data => serverResponse.end(data))
    } else {
        serverResponse.end()
    }
}

function convertHeadersFromFetch(from: Headers): OutgoingHttpHeaders {
    const to: OutgoingHttpHeaders = {}
    for (const name of from.keys()) {
        to[name] = from.get(name)!
    }
    return to
}

function convertHeadersToFetch(from: IncomingHttpHeaders): Headers {
    const to = new Headers()
    for (const [name, values] of Object.entries(from)) {
        if (Array.isArray(values)) {
            for (const value of values) to.append(name, value)
        } else if (values) {
            to.set(name, values)
        }
    }
    return to
}
