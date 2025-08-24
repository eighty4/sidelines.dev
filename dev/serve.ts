import { mkdir, rm } from 'node:fs/promises'
import { join as fsJoin } from 'node:path'
import esbuild from 'esbuild'
import { performBuild, webpages, workers } from './build.ts'
import { defineSidelinesForEsbuildWatch } from './define.ts'
import { esbuildBuildOptsForWebpage } from './esbuild.ts'
import { HtmlEntrypoint } from './html.ts'
import {
    createEsbuildFilesFetcher,
    createFrontendFilesFetcher,
    createWebServer,
    type FrontendFetcher,
} from './http.ts'

if (process.argv.some(arg => arg === '-h' || arg === '--help')) {
    console.log('node ./dev/serve.ts [--preview] [--production] [--tls]')
    console.log('\nOPTIONS:')
    console.log('  --preview      pre-bundled with ServiceWorker')
    console.log('  --production   minify pre-bundled sources with preview')
    process.exit(0)
}

const isPreview =
    process.env.PREVIEW === 'true' || process.argv.includes('--preview')
const isProduction =
    process.env.PRODUCTION === 'true' || process.argv.includes('--production')
const PORT = isPreview ? 4000 : 3000
const ESBUILD_PORT = 2999

if (
    !process.env.GH_APP_ID ||
    !process.env.GH_CLIENT_ID ||
    !process.env.GH_CLIENT_SECRET
) {
    throw new Error('must set GH_APP_ID, GH_CLIENT_ID and GH_CLIENT_SECRET')
}

await rm('build', { force: true, recursive: true })

async function startEsbuildWatch(): Promise<{ port: number }> {
    const watchDir = fsJoin('build', 'watch')
    await mkdir(watchDir, { recursive: true })

    const entryPointUrls: Set<string> = new Set()
    const entryPoints: esbuild.BuildOptions['entryPoints'] = []

    Object.entries(workers).map(([urlPath, fsPath]) => {
        entryPoints.push({
            in: fsPath,
            out: urlPath.substring(1, urlPath.indexOf('.js')),
        })
    })

    await Promise.all(
        Object.entries(webpages).map(async ([urlPath, fsPath]) => {
            const html = await HtmlEntrypoint.readFrom(fsJoin('pages', fsPath))
            if (urlPath !== '/') {
                await mkdir(fsJoin(watchDir, urlPath), { recursive: true })
            }
            html.collectScripts()
                .filter(scriptImport => !entryPointUrls.has(scriptImport.in))
                .forEach(scriptImport => {
                    entryPointUrls.add(scriptImport.in)
                    entryPoints.push({
                        in: scriptImport.in,
                        out: scriptImport.out,
                    })
                })
            html.rewriteHrefs()
            await html.writeTo(fsJoin(watchDir, urlPath, 'index.html'))
            return html
        }),
    )

    const ctx = await esbuild.context({
        ...esbuildBuildOptsForWebpage({ minify: isProduction }),
        entryNames: '[dir]/[name]',
        entryPoints,
        define: defineSidelinesForEsbuildWatch(),
        outdir: watchDir,
        splitting: false,
    })

    await ctx.watch()

    await ctx.serve({
        host: '127.0.0.1',
        port: ESBUILD_PORT,
        servedir: watchDir,
    })

    return { port: ESBUILD_PORT }
}

let frontend: FrontendFetcher
if (isPreview) {
    const { dir, files } = await performBuild()
    frontend = createFrontendFilesFetcher(dir, files)
} else {
    const { port } = await startEsbuildWatch()
    frontend = createEsbuildFilesFetcher(port)
}

process.env.WEBAPP_ADDRESS = `http://127.0.0.1:${PORT}`

createWebServer(frontend).listen(PORT)

console.log(`sidelines.dev is running at http://127.0.0.1:${PORT}`)
