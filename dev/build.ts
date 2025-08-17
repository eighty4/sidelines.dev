import { mkdir, rename, rm } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { join } from 'node:path/posix'
import { $, type BuildConfig } from 'bun'
import monacoPackageJson from '../node_modules/monaco-editor/package.json' with { type: 'json' }
import { paths as apiRoutes } from '../server/routes.ts'

if (
    import.meta.main &&
    Bun.argv.some(arg => arg === '-h' || arg === '--help')
) {
    console.log('bun ./dev/build.ts [--minify] [--production]')
    console.log('\nOPTIONS:')
    console.log('  --minify       build minified sources')
    console.log('  --production   minify and use release tag versioning')
    process.exit(0)
}

type WebappPath = `/${string}`

const production =
    Bun.env.PRODUCTION === 'true' || Bun.argv.includes('--production')
const minify =
    production || Bun.env.MINIFY === 'true' || Bun.argv.includes('--minify')
const buildTag = await createBuildTag()

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
    if (production) {
        return `${when}-${(await $`git rev-parse --short HEAD`.text()).trimEnd()}`
    } else {
        return when
    }
}

function bunBuildOpts(): Omit<BuildConfig, 'entrypoints'> {
    return {
        minify,
        outdir: 'build/dist',
    }
}

function bunBuildJavaScriptOpts(): Omit<BuildConfig, 'entrypoints'> {
    return {
        ...bunBuildOpts(),
        format: 'iife',
        splitting: false,
        target: 'browser',
    }
}

export const webpages: Record<WebappPath, string> = {
    '/': './pages/home/Home.html',
    '/configure': './pages/configure/Configure.html',
    '/project': './pages/project/Project.html',
    '/notes': './pages/project/notes/Notes.html',
}

// workers are namespaced in /lib/monaco or /lib/sidelines
// this record is keyed by the scripts' names during dev without versioning
// monaco is versioned by npm package version
// sidelines is versioned by build hash
export const workers: Record<WebappPath, string> = {
    '/lib/sidelines/syncRefs.js': './workers/syncRefs.ts',
    '/lib/sidelines/userData.js': './libs/data/src/userData/worker.ts',
    '/lib/sidelines/callToActions/ghActions.js':
        './libs/data/src/callToActions/ghActions.ts',
    '/lib/monaco/main.js':
        './node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
    '/lib/monaco/css.js':
        './node_modules/monaco-editor/esm/vs/language/css/css.worker.js',
    '/lib/monaco/html.js':
        './node_modules/monaco-editor/esm/vs/language/html/html.worker.js',
    '/lib/monaco/json.js':
        './node_modules/monaco-editor/esm/vs/language/json/json.worker.js',
    '/lib/monaco/ts.js':
        './node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js',
}

// todo create a PR for Bun.build HTMLBundle's asset naming
async function buildWebpage(
    out: WebappPath,
    src: string,
): Promise<Array<WebappPath>> {
    // Bun.build automagically creates an HTMLBundle of all of a webpage's CSS and JS
    const buildOutput = await Bun.build({
        ...bunBuildOpts(),
        entrypoints: [src],
        outdir: join('build', 'tmp', out),
    })
    const pagePaths: Array<WebappPath> = [join(out, 'index.html') as WebappPath]
    // htmlFilename is Home.html or Project.html
    const htmlFilename = basename(src)
    // pageName is Home.html or Project.html lowercase and without extension
    const pageName = htmlFilename
        .substring(0, htmlFilename.indexOf('.'))
        .toLowerCase()
    const assetsDir = join('/lib/assets', pageName)
    // rename does not create intermediary directories so we do mkdir first
    await mkdir(join('build/dist', assetsDir), { recursive: true })
    let htmlSrc = await Bun.file(join('build', 'tmp', out, htmlFilename)).text()
    for (const output of buildOutput.outputs) {
        if (output.path.endsWith('css') || output.path.endsWith('js')) {
            const chunkFilenameFrom = basename(output.path)
            const chunkFilenameTo =
                pageName + chunkFilenameFrom.substring('chunk'.length)
            const assetPath = join(assetsDir, chunkFilenameTo) as WebappPath
            await rename(output.path, join('build/dist', assetPath))
            pagePaths.push(assetPath)
            htmlSrc = htmlSrc.replace(`./${chunkFilenameFrom}`, assetPath)
        }
    }
    await Bun.write(join('build', 'dist', out, 'index.html'), htmlSrc)
    return pagePaths
}

async function buildWorker(out: WebappPath, src: string): Promise<WebappPath> {
    const versioning = out.startsWith('/lib/monaco/')
        ? monacoPackageJson.version
        : '[hash]'
    const naming = out.substring(1).replace('.js', `-${versioning}.[ext]`)
    const buildOutput = await Bun.build({
        ...bunBuildJavaScriptOpts(),
        entrypoints: [src],
        naming,
    })
    return `${join(dirname(out), basename(buildOutput.outputs[0].path))}` as WebappPath
}

async function buildServiceWorker(
    files: Array<WebappPath>,
): Promise<WebappPath> {
    await writeCacheManifest(files)
    await Bun.build({
        ...bunBuildJavaScriptOpts(),
        entrypoints: ['./workers/serviceWorker.ts'],
        naming: 'sidelines.sw.js',
    })
    return '/sidelines.sw.js'
}

export async function prepareBuildDirForBundler() {
    await rm('build', { recursive: true, force: true })
    await writeDefinitionsManifest()
}

// todo Bun.build HTMLBundle support for `define` and `env` should replace this
// definitions.json are pre-build resolvable values used within the app
// excludes build computed values like asset hashing
//  that cannot be statically resolved pre-build
async function writeDefinitionsManifest() {
    await writeJsonToBuildDir('definitions.json', {
        MONACO_VERSION: monacoPackageJson.version,
    })
}

async function writeCacheManifest(files: Array<string>) {
    const stripIndexHtmlLength = '/index.html'.length
    await writeJsonToBuildDir('cache.json', {
        apiRoutes,
        buildTag,
        files: files.map(file => {
            if (file.endsWith('.html')) {
                if (file === '/index.html') {
                    return '/'
                } else {
                    return file.substring(0, file.length - stripIndexHtmlLength)
                }
            } else {
                return file
            }
        }),
    })
}

async function writeBuildManifest(files: Array<string>) {
    await writeJsonToBuildDir('manifest.json', { buildTag, files })
}

async function writeJsonToBuildDir(filename: `${string}.json`, json: any) {
    await Bun.write(join('./build', filename), JSON.stringify(json, null, 4))
}

// todo Bun.build HTMLBundle support for `define` and `env` should replace this
async function rewriteHashedWorkerURLs(
    files: Array<string>,
    workerHashing: Record<string, string>,
) {
    for (const file of files) {
        if (file.startsWith('/lib/assets/') && file.endsWith('.js')) {
            const path = join('build/dist', file)
            let src = await Bun.file(path).text()
            for (const [fromURL, toURL] of Object.entries(workerHashing)) {
                src = src.replaceAll(fromURL, toURL)
            }
            await Bun.write(path, src)
        }
    }
}

export async function performBuild(): Promise<Array<WebappPath>> {
    console.log(
        minify
            ? production
                ? 'minified production'
                : 'minified'
            : 'unminified',
        'build',
        buildTag,
        'building in ./build/dist',
    )
    await prepareBuildDirForBundler()
    const files: Array<WebappPath> = []
    const workerHashing: Record<string, string> = {}
    for (const [out, src] of Object.entries(workers)) {
        files.push(
            (workerHashing[out] = await buildWorker(out as WebappPath, src)),
        )
    }
    for (const [out, src] of Object.entries(webpages)) {
        files.push(...(await buildWebpage(out as WebappPath, src)))
    }
    files.push(await buildServiceWorker(files))
    await rewriteHashedWorkerURLs(files, workerHashing)
    await writeBuildManifest(files)
    await rm(join('build', 'tmp'), { recursive: true, force: true })
    return files
}

if (import.meta.main) {
    await performBuild()
}
