import type { Server } from 'bun'
import { performBuild } from './dev/build.ts'
import { routesFromBundledFiles } from './dev/serve.ts'
import { routes as serverRoutes } from './server/routes.ts'

if (!Bun.env.WEBAPP_ADDRESS) {
    throw Error('WEBAPP_ADDRESS is required')
}

const frontendRoutes = routesFromBundledFiles(await performBuild())

const fetch = async (req: Request, _server: Server) => {
    const url = new URL(req.url)
    console.log(404, req.method, url)
    return new Response('Not Found', { status: 404 })
}

const server = Bun.serve({
    development: false,
    routes: {
        ...frontendRoutes,
        ...serverRoutes,
    },
    fetch,
})

console.log('sidelines.dev is running at http://127.0.0.1:' + server.port)
