// import { readFile, writeFile } from 'node:fs/promises'
import { defineConfig } from '@eighty4/dank'

export default defineConfig(({ mode }) => ({
    devPages: {
        '/__data': './_dev/data/Data.html',
    },
    pages: {
        '/': './home/Home.html',
        '/configure': './configure/Configure.html',
        '/project': {
            pattern:
                /^\/[a-z\d][a-z\d-_]{0,37}[a-z\d]?\/[a-z\d._][a-z\d-._]{0,38}[a-z\d._]?$/,
            webpage: './project/Project.html',
        },
        '/gameplan': './gameplan/Gameplan.html',
        '/watches': './watching/watches/Watches.html',
        '/reading': './watching/reading/Reading.html',
    },
    esbuild: {
        loaders: {
            '.html': 'text',
            '.woff': 'file',
            '.woff2': 'file',

            // for `monaco-editor` codeicon.ttf
            '.ttf': 'file',
        },
    },
    port: 3000,
    previewPort: 4000,
    services: [
        {
            command:
                mode === 'preview'
                    ? `node --env-file-if-exists .env.local local.ts`
                    : `node --env-file-if-exists .env.local --watch local.ts`,
            http: {
                port: 3333,
            },
        },
    ],
    // afterBuild: async ({ website }) => {
    //     const pattern =
    //         /\/workers\/jobs\/forEachViewerOwnedRepo\/upgradeWorkflowActions-[A-Z\d]{8}\.js/
    //     const builtWorkerUrl = website.files.find(f => pattern.test(f))
    //     if (!builtWorkerUrl) {
    //         throw Error()
    //     }
    //     const jobsMetadata = JSON.parse(
    //         await readFile('./public/jobs.json', 'utf8'),
    //     )
    //     jobsMetadata['WORKFLOWS::UPGRADE_ACTIONS'].path = builtWorkerUrl
    //     await writeFile(
    //         './build/dist/jobs.json',
    //         JSON.stringify(jobsMetadata),
    //     )
    // },
}))
