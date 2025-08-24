import { type BuildOptions, type BuildResult, type Message } from 'esbuild'

export function esbuildBuildOptsForWebpage(): BuildOptions {
    return {
        assetNames: 'lib/assets/[name]-[hash]',
        bundle: true,
        chunkNames: 'lib/sidelines/[name]-[hash]',
        entryNames: '[dir]/[name]-[hash]',
        external: ['monaco-editor'],
        format: 'esm',
        // loader: {
        //     '.ttf': 'file',
        // },
        minify: false,
        platform: 'browser',
        splitting: true,
        treeShaking: true,
    }
}

export function esbuildBuildOptsForWorker(minify: boolean): BuildOptions {
    return {
        bundle: true,
        format: 'iife',
        minify,
        platform: 'browser',
        treeShaking: true,
    }
}

export function esbuildResultChecks(buildResult: BuildResult) {
    if (buildResult.errors.length) {
        buildResult.errors.forEach(msg => esbuildPrintMessage(msg, 'warning'))
        process.exit(1)
    }
    if (buildResult.warnings.length) {
        buildResult.warnings.forEach(msg => esbuildPrintMessage(msg, 'warning'))
    }
}

export function esbuildPrintMessage(
    msg: Message,
    category: 'error' | 'warning',
) {
    const location = msg.location
        ? ` (${msg.location.file}L${msg.location.line}:${msg.location.column})`
        : ''
    console.error(`esbuild ${category}${location}:`, msg.text)
    msg.notes.forEach(note => {
        console.error('  ', note.text)
        if (note.location) console.error('   ', note.location)
    })
}
