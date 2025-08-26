import { exec } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, join as fsJoin, extname } from 'node:path'
import esbuild from 'esbuild'
import {
    defineSidelinesFromWorkerUrls,
    type DefineSidelinesGlobal,
    monacoVersion,
} from './define.ts'
import {
    esbuildBuildOptsForWebpage,
    esbuildBuildOptsForWorker,
    esbuildResultChecks,
} from './esbuild.ts'
import { isProductionBuild, willMinify } from './flags.ts'
import { HtmlEntrypoint } from './html.ts'
import { copyAssets } from './public.ts'
import { paths as apiRoutes } from '../server/routes.ts'

// fyi if invoked directly by shell as executable it would be argv[0]
const isMain = process.argv[1].endsWith(import.meta.filename)

if (isMain && process.argv.some(arg => arg === '-h' || arg === '--help')) {
    console.log('node ./dev/build.ts [--minify] [--production]')
    console.log('\nOPTIONS:')
    console.log('  --minify       minify sources')
    console.log('  --production   build for production release')
    process.exit(0)
}

const buildTag = await createBuildTag()
const buildDir = fsJoin('build', 'dist')

async function createBuildTag(): Promise<string> {
    const now = new Date()
    const ms =
        now.getUTCMilliseconds() +
        now.getUTCSeconds() * 1000 +
        now.getUTCMinutes() * 1000 * 60 +
        now.getUTCHours() * 1000 * 60 * 60
    const date = now.toISOString().substring(0, 10)
    const time = String(ms).padStart(8, '0')
    const when = `${date}-${time}`
    if (isProductionBuild()) {
        const gitHash = await new Promise((res, rej) =>
            exec('git rev-parse --short HEAD', (err, stdout) => {
                if (err) rej(err)
                res(stdout.trim())
            }),
        )
        return `${when}-${gitHash}`
    } else {
        return when
    }
}

export const webpages: Record<string, string> = {
    '/': './home/Home.html',
    '/configure': './configure/Configure.html',
    '/gameplan': './gameplan/Gameplan.html',
    '/project': './project/Project.html',
    '/notes': './project/notes/Notes.html',
}

// workers are namespaced in /lib/monaco/workers or /lib/sidelines/workers
// this record is keyed by the scripts' names during dev without versioning
// monaco is versioned by npm package version
// sidelines is versioned by build hash
export const workers: Record<string, string> = {
    '/lib/sidelines/workers/syncRefs.js': './workers/syncRefs.ts',
    '/lib/sidelines/workers/userData.js': './workers/userData.ts',
    '/lib/sidelines/workers/ghActions.js': './workers/ghActions.ts',
    '/lib/monaco/workers/main.js':
        './node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
    '/lib/monaco/workers/css.js':
        './node_modules/monaco-editor/esm/vs/language/css/css.worker.js',
    '/lib/monaco/workers/html.js':
        './node_modules/monaco-editor/esm/vs/language/html/html.worker.js',
    '/lib/monaco/workers/json.js':
        './node_modules/monaco-editor/esm/vs/language/json/json.worker.js',
    '/lib/monaco/workers/ts.js':
        './node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js',
}

async function buildWebpage(
    urlPath: string,
    fsPath: string,
    define: DefineSidelinesGlobal,
): Promise<Array<string>> {
    const html = await HtmlEntrypoint.readFrom(fsJoin('pages', fsPath))
    await html.injectPartials()
    if (urlPath !== '/') {
        await mkdir(fsJoin(buildDir, urlPath), { recursive: true })
    }
    const entryPointUrls: Set<string> = new Set()
    const entryPoints: Array<{ in: string; out: string }> = html
        .collectScripts()
        .filter(scriptImport => !entryPointUrls.has(scriptImport.in))
        .map(scriptImport => {
            entryPointUrls.add(scriptImport.in)
            return {
                in: scriptImport.in,
                out: scriptImport.out,
            }
        })
    const buildResult = await esbuild.build({
        ...esbuildBuildOptsForWebpage(),
        define,
        entryPoints,
        outdir: buildDir,
    })
    esbuildResultChecks(buildResult)
    await writeMetafile(`page.${basename(fsPath)}.json`, buildResult.metafile)
    const mapInToOutHrefs: Record<string, string> = {}
    for (const [outputFile, { entryPoint }] of Object.entries(
        buildResult.metafile.outputs,
    )) {
        mapInToOutHrefs[entryPoint!] = outputFile.substring(
            outputFile.indexOf('/lib/sidelines/pages'),
        )
    }
    html.rewriteHrefs(mapInToOutHrefs)
    await html.writeTo(fsJoin(buildDir, urlPath, 'index.html'))
    return [
        urlPath,
        ...Object.keys(buildResult.metafile.outputs).map(p =>
            p.substring(p.indexOf('/lib/sidelines/')),
        ),
    ]
}

async function buildWorker(urlPath: string, src: string): Promise<string> {
    const versioning = urlPath.startsWith('/lib/monaco/')
        ? monacoVersion
        : '[hash]'
    const naming = urlPath.substring(1).replace('.js', `-${versioning}`)
    const buildResult = await esbuild.build({
        ...esbuildBuildOptsForWorker(),
        entryPoints: [src],
        entryNames: naming,
        // esbuild does not return outputFiles[].hash
        // if it writes to disk :(
        write: false,
    })
    esbuildResultChecks(buildResult)
    await writeMetafile(`worker.${basename(src)}.json`, buildResult.metafile)
    const hash = buildResult.outputFiles[0].hash
    const path = `${dirname(urlPath)}/${basename(urlPath.replace('.js', `-${versioning.replace('[hash]', hash)}.js`))}`
    const out = join('build/dist', path)
    await mkdir(dirname(out), { recursive: true })
    await writeFile(out, buildResult.outputFiles[0].contents)
    return path
}

async function buildServiceWorker(files: Set<string>): Promise<string> {
    await writeCacheManifest(files)
    const buildResult = await esbuild.build({
        ...esbuildBuildOptsForWorker(),
        entryPoints: ['./workers/serviceWorker.ts'],
        entryNames: 'sidelines.sw',
        outdir: 'build/dist',
    })
    esbuildResultChecks(buildResult)
    await writeMetafile(`sidelines.sw.json`, buildResult.metafile)
    return '/sidelines.sw.js'
}

export async function performBuild(): Promise<{
    dir: string
    files: Set<string>
}> {
    console.log(
        willMinify()
            ? isProductionBuild()
                ? 'minified production'
                : 'minified'
            : 'unminified',
        'build',
        buildTag,
        'building in ./build/dist',
    )
    await rm('build', { recursive: true, force: true })
    await mkdir(buildDir, { recursive: true })
    await mkdir(fsJoin('build', 'metafiles'), { recursive: true })
    const staticAssets = await copyAssets(fsJoin('build', 'dist'))
    const buildUrls: Array<string> = []
    const workerBuildUrls: Record<string, string> = {}
    for (const [urlPath, fsPath] of Object.entries(workers)) {
        buildUrls.push(
            (workerBuildUrls[urlPath] = await buildWorker(urlPath, fsPath)),
        )
    }
    const definitions = defineSidelinesFromWorkerUrls(workerBuildUrls)
    for (const [urlPath, fsPath] of Object.entries(webpages)) {
        buildUrls.push(...(await buildWebpage(urlPath, fsPath, definitions)))
    }
    buildUrls.push(
        await buildServiceWorker(
            new Set([...buildUrls, ...staticAssets.cached]),
        ),
    )
    buildUrls.push(...staticAssets.all)
    const result = new Set(buildUrls)
    await writeBuildManifest(result)
    validateBuildUrls(result)
    return {
        dir: buildDir,
        files: result,
    }
}

if (isMain) {
    await performBuild()
}

// safety check to catch conflicts with github style repo routes
function validateBuildUrls(files: Set<string>) {
    let e = false
    for (const f of files) {
        if (!f.startsWith('/')) {
            console.error(f, 'is not prefixed with /')
            e = true
        } else if (f.split('/').length === 3) {
            console.error(f, 'clashes with /owner/repo style repo routes')
            e = true
        }
    }
    if (e) process.exit(1)
}

async function writeMetafile(filename: string, json: any) {
    await writeFile(
        join('build', 'metafiles', filename),
        JSON.stringify(json, null, 4),
    )
}

async function writeCacheManifest(files: Set<string>) {
    await writeJsonToBuildDir('cache.json', {
        apiRoutes,
        buildTag,
        files: Array.from(files).map(filenameToWebappPath),
    })
}

// drops index.html from path
function filenameToWebappPath(p: string): string {
    if (p === '/index.html') {
        return '/'
    } else if (p.endsWith('/index.html')) {
        return p.substring(0, p.length - '/index.html'.length) as `/${string}`
    } else {
        return p
    }
}

async function writeBuildManifest(files: Set<string>) {
    await writeJsonToBuildDir('manifest.json', {
        buildTag,
        files: Array.from(files).map(f => {
            if (extname(f) === '') {
                return f === '/' ? '/index.html' : f + '/index.html'
            } else {
                return f
            }
        }),
    })
}

async function writeJsonToBuildDir(filename: `${string}.json`, json: any) {
    await writeFile(join('./build', filename), JSON.stringify(json, null, 4))
}
