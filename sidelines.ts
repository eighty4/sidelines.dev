import type { Server } from 'bun'
import { routes } from './server/routes.ts'

if (!Bun.env.WEBAPP_ADDRESS) {
    throw Error('WEBAPP_ADDRESS is required')
}

const fetch = async (req: Request, _server: Server) => {
    const url = new URL(req.url)
    console.log(404, req.method, url)
    return new Response('Not Found', { status: 404 })
}

// todo incorporate static routes for HTML, JS and CSS
//  reuse ./dev/serve.ts routesForPreBundled logic with
//  build manifest from ./build/manifest.json
const server = Bun.serve({
    development: false,
    routes: routes,
    fetch,
})

console.log('sidelines.dev is running at http://127.0.0.1:' + server.port)
