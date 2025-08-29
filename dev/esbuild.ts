import esbuild, {
    type BuildContext,
    type BuildOptions,
    type BuildResult,
    type Message,
    type Metafile,
} from 'esbuild'
import {
    defineSidelinesForEsbuildWatch,
    type DefineSidelinesGlobal,
} from './define.ts'
import { willMinify } from './flags.ts'

export async function esbuildDevContext(
    entryPoints: BuildOptions['entryPoints'],
    outdir: string,
): Promise<BuildContext> {
    return await esbuild.context({
        bundle: true,
        entryNames: '[dir]/[name]',
        entryPoints,
        define: defineSidelinesForEsbuildWatch(),
        external: ['monaco-editor'],
        minify: willMinify(),
        outdir,
        platform: 'browser',
        splitting: false,
        write: true,
    })
}

export async function esbuildWebpages(
    define: DefineSidelinesGlobal,
    entryPoints: Array<{ in: string; out: string }>,
    outdir: string,
): Promise<Metafile> {
    const buildResult = await esbuild.build({
        define,
        entryPoints,
        outdir,
        assetNames: 'lib/assets/[name]-[hash]',
        bundle: true,
        chunkNames: 'lib/sidelines/[name]-[hash]',
        entryNames: '[dir]/[name]-[hash]',
        external: ['monaco-editor'],
        format: 'esm',
        // loader: {
        //     '.ttf': 'file',
        // },
        metafile: true,
        minify: willMinify(),
        platform: 'browser',
        splitting: true,
        treeShaking: true,
        write: true,
    })
    esbuildResultChecks(buildResult)
    return buildResult.metafile
}

export async function esbuildWorkers(
    entryPoints: Array<string>,
    entryNames: string,
    outdir: string,
): Promise<Metafile> {
    const buildResult = await esbuild.build({
        entryPoints,
        entryNames,
        outdir,
        bundle: true,
        format: 'iife',
        metafile: true,
        minify: willMinify(),
        platform: 'browser',
        splitting: false,
        treeShaking: true,
        write: true,
    })
    esbuildResultChecks(buildResult)
    return buildResult.metafile
}

function esbuildResultChecks(buildResult: BuildResult) {
    if (buildResult.errors.length) {
        buildResult.errors.forEach(msg => esbuildPrintMessage(msg, 'warning'))
        process.exit(1)
    }
    if (buildResult.warnings.length) {
        buildResult.warnings.forEach(msg => esbuildPrintMessage(msg, 'warning'))
    }
}

function esbuildPrintMessage(msg: Message, category: 'error' | 'warning') {
    const location = msg.location
        ? ` (${msg.location.file}L${msg.location.line}:${msg.location.column})`
        : ''
    console.error(`esbuild ${category}${location}:`, msg.text)
    msg.notes.forEach(note => {
        console.error('  ', note.text)
        if (note.location) console.error('   ', note.location)
    })
}
