import { join } from 'node:path'
import type { ServeFunctionOptions, Server, TLSOptions } from 'bun'
import {
    performBuild,
    prepareBuildDirForBundler,
    webpages,
    workers,
} from './build.ts'
import { isValidGitHubRepoUrl } from '../pages/ghRepoUrl.ts'
import ComponentsPage from '../pages/_dev/components/Components.html'
import DataPage from '../pages/_dev/data/Data.html'
import { routes as apiRoutes } from '../server/routes.ts'

const CRT_FILE = './dev/certificate.crt'
const KEY_FILE = './dev/private.key'

if (Bun.argv.some(arg => arg === '-h' || arg === '--help')) {
    console.log('bun ./dev/serve.ts [--preview] [--production] [--tls]')
    console.log('\nOPTIONS:')
    console.log('  --preview      pre-bundled with ServiceWorker')
    console.log('  --production   minify pre-bundled sources with preview')
    console.log('  --tls          use', CRT_FILE, 'and', KEY_FILE, 'for tls')
    process.exit(0)
}

type BunServeOpts = ServeFunctionOptions<any, any>

const isPreview = Bun.env.PREVIEW === 'true' || Bun.argv.includes('--preview')

Bun.env.WEBAPP_ADDRESS = isPreview
    ? 'http://127.0.0.1:4000'
    : 'http://127.0.0.1:3000'

let tls: TLSOptions | undefined = undefined

if (Bun.env.TLS === 'true' || Bun.argv.includes('--tls')) {
    const tlsFilesReady =
        (await Bun.file(CRT_FILE).exists()) &&
        (await Bun.file(KEY_FILE).exists())
    if (!tlsFilesReady) {
        console.log(`must create TLS files ${CRT_FILE} and ${KEY_FILE}`)
        process.exit(1)
    }
    tls = {
        certFile: CRT_FILE,
        keyFile: KEY_FILE,
    }
}

async function frontendBundleOnRequestRoutes(): Promise<
    BunServeOpts['routes']
> {
    // ensure ./build/definitions.json is in place during dev bundling
    await prepareBuildDirForBundler()
    const routes: BunServeOpts['routes'] = {
        ...routesForDevPages(),
    }
    for (const [path, src] of Object.entries(webpages)) {
        // map Bun.build entrypoint input of a ./ path from project root
        // to a ../ import path from ./dev/serve.ts
        const webpageImportPath = src.replace(/^\.\//, '../')
        routes[path] = (await import(webpageImportPath)).default
    }
    for (const [path, src] of Object.entries(workers)) {
        routes[path] = async () => {
            const buildOutput = await Bun.build({
                entrypoints: [src],
                format: 'iife',
                splitting: false,
                target: 'browser',
                minify: false,
            })
            return new Response(buildOutput.outputs[0], {
                headers: new Headers({
                    'Content-Type': 'application/javascript',
                }),
            })
        }
    }
    return routes
}

async function frontendPreBundledRoutes(): Promise<BunServeOpts['routes']> {
    const files = await performBuild()
    const routes = {
        ...routesForDevPages(),
    }
    for (const file of files) {
        if (file === '/sidelines.sw.js') {
            const headers = new Headers()
            headers.set(
                'Cache-Control',
                'no-cache, no-store, must-revalidate, max-age=0',
            )
            routes[file] = new Response(Bun.file(join('build/dist', file)), {
                headers,
            })
        } else {
            // todo this mapping is duplicated in ./dev/build.ts to create ./build/cache.json
            let urlPath = file
            if (file === '/index.html') {
                urlPath = '/'
            } else if (file.endsWith('/index.html')) {
                urlPath = urlPath.substring(
                    0,
                    urlPath.length - '/index.html'.length,
                ) as `/${string}`
            }
            routes[urlPath] = Bun.file(join('build/dist', file))
        }
    }
    return routes
}

function routesForDevPages(): BunServeOpts['routes'] {
    return {
        '/_data': DataPage,
        '/_ui': ComponentsPage,
    }
}

async function routes(): Promise<BunServeOpts['routes']> {
    const frontendRoutes: BunServeOpts['routes'] = isPreview
        ? await frontendPreBundledRoutes()
        : await frontendBundleOnRequestRoutes()
    return {
        ...frontendRoutes,
        ...apiRoutes,
    }
}

// dev mode fetch supports /eighty4/changelog style repo URLs
// Cloudflare transform rules handles this in production
function fetch(req: Request, _server: Server) {
    const url = new URL(req.url)
    if (isValidGitHubRepoUrl(url)) {
        const urlParts = url.pathname.substring(1).split('/')
        const [owner, name] = urlParts
        const redirectUrl =
            urlParts.length > 2 && urlParts[2] === 'notes'
                ? `/notes?owner=${owner}&name=${name}`
                : `/project?owner=${owner}&name=${name}`
        return Response.redirect(redirectUrl, 302)
    }
    console.log(404, req.method, req.url)
    return new Response('Not Found', { status: 404 })
}

const port = isPreview ? 4000 : 3000

Bun.serve({
    development: true,
    routes: await routes(),
    tls,
    fetch,
    port,
})

const protocol = tls ? 'https' : 'http'
const address = `${protocol}://127.0.0.1:${port}`
console.log(`sidelines.dev is running at ${address}`)
console.log()
console.log(
    `    ${address}/_data`,
    `\u001b[90m${'for IndexedDB & OPFS'}\u001b[0m`,
)
console.log(`    ${address}/_ui`, `\u001b[90m${'for UI components'}\u001b[0m`)
console.log()
