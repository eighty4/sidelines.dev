import { rm } from 'node:fs/promises'
import { build } from 'esbuild'
import monacoEditorPackageJson from 'monaco-editor/package.json' with { type: 'json' }

const MONACO_VERSION = monacoEditorPackageJson.version

function inPath(subpath: string): string {
    return './node_modules/monaco-editor/esm/vs/' + subpath
}

const workers: Array<{ in: string; out: string }> = [
    {
        in: inPath('/editor/editor.worker.js'),
        out: 'editor.worker',
    },
    {
        in: inPath('/language/css/css.worker.js'),
        out: 'css.worker',
    },
    {
        in: inPath('/language/html/html.worker.js'),
        out: 'html.worker',
    },
    {
        in: inPath('/language/json/json.worker.js'),
        out: 'json.worker',
    },
    {
        in: inPath('/language/typescript/ts.worker.js'),
        out: 'ts.worker',
    },
]

const outdir = `public/monaco/${MONACO_VERSION}`

await rm(outdir, { force: true, recursive: true })

await build({
    entryPoints: workers,
    entryNames: '[name]',
    outdir,
    bundle: true,
    format: 'iife',
    metafile: false,
    minify: true,
    platform: 'browser',
    splitting: false,
    treeShaking: true,
    write: true,
})
