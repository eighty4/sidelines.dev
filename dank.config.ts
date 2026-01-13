import { defineConfig } from '@eighty4/dank'

export default defineConfig({
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
        },
    },
    port: 3000,
    previewPort: 4000,
    services: [
        {
            command: 'node --env-file-if-exists .env.local local.ts',
            http: {
                port: 3333,
            },
        },
    ],
})
