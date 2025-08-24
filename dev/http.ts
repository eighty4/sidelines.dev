import { createReadStream } from 'node:fs'
import {
    createServer,
    type IncomingHttpHeaders,
    type IncomingMessage,
    type OutgoingHttpHeaders,
    type ServerResponse,
} from 'node:http'
import { extname, join as fsJoin } from 'node:path'
import {
    type HttpMethod,
    type RequestHandler,
    routes,
} from '../server/routes.ts'

export type FrontendFetcher = (url: URL, res: ServerResponse) => void

export function createEsbuildFilesFetcher(
    esbuildPort: number,
): FrontendFetcher {
    return (url: URL, res: ServerResponse) => {
        fetch(`http://127.0.0.1:${esbuildPort}${url.pathname}`).then(
            fetchResponse => {
                res.writeHead(
                    fetchResponse.status,
                    convertHeadersFromFetch(fetchResponse.headers),
                )
                fetchResponse.text().then(data => res.end(data))
            },
        )
    }
}

export function createFrontendFilesFetcher(
    dir: string,
    files: Array<string>,
): FrontendFetcher {
    return (url: URL, res: ServerResponse) => {
        if (!files.includes(url.pathname)) {
            res.writeHead(404)
            res.end()
        } else {
            let p = fsJoin(dir, url.pathname)
            switch (extname(url.pathname)) {
                case '':
                    res.setHeader('Content-Type', 'text/html')
                    p = p + '/index.html'
                    break
                case '.js':
                    res.setHeader('Content-Type', 'text/javascript')
                    break
                case '.css':
                    res.setHeader('Content-Type', 'text/css')
                    break
                default:
                    res.setHeader('Content-Type', 'application/octet-stream')
            }
            const reading = createReadStream(p)
            reading.pipe(res)
            reading.on('error', err => {
                console.error(
                    `${url.pathname} file read ${p} error ${err.message}`,
                )
                res.statusCode = 500
                res.end()
            })
        }
    }
}

export function createWebServer(
    frontendFetcher: FrontendFetcher,
): ReturnType<typeof createServer> {
    return createServer((req: IncomingMessage, res: ServerResponse) => {
        if (!req.url || !req.method) {
            res.end()
        } else {
            const url = new URL(`${process.env.WEBAPP_ADDRESS}${req.url}`)
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
                frontendFetcher(url, res)
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
