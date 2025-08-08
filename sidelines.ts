import { GH_TOKEN, getCookie } from '@sidelines/data'
import type { ServeFunctionOptions, Server } from 'bun'
import configurePage from './pages/configure/Configure.html'
import homePage from './pages/home/Home.html'
import projectPage from './pages/project/Project.html'
import notesPage from './pages/project/notes/Notes.html'
import { loginRedirectUrl, logoutRedirectUrl } from './pages/nav.ts'

const PROD = Bun.env.PROD === 'true'

console.log(`sidelines.dev is starting in ${PROD ? 'PROD' : 'DEV'} mode`)

if (!process.env.WEBAPP_ADDRESS) {
    throw Error('WEBAPP_ADDRESS is required')
}

const { WEBAPP_ADDRESS } = process.env

const workerBuilds = await Bun.build({
    entrypoints: [
        './workers/syncRefs.ts',
        './libs/data/src/userData/worker.ts',
        './libs/data/src/callToActions/ghActions.ts',
        './node_modules/monaco-editor/esm/vs/editor/editor.worker.js',
        './node_modules/monaco-editor/esm/vs/language/css/css.worker.js',
        './node_modules/monaco-editor/esm/vs/language/html/html.worker.js',
        './node_modules/monaco-editor/esm/vs/language/json/json.worker.js',
        './node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js',
    ],
    format: 'iife',
    minify: PROD,
    splitting: false,
    target: 'browser',
})

const [
    syncRefsWorker,
    userDataWorker,
    ghActionsWorker,
    mainWorker,
    cssWorker,
    htmlWorker,
    jsonWorker,
    tsWorker,
] = workerBuilds.outputs

// these redirect URLs are GitHub App configs
const userLoginRedirectFromGitHub = '/github/redirect/user/authorized'
// todo app install currently redirects to /configure and this endpoint is not used
const appInstallRedirectFromGitHub = '/github/redirect/app/installation'

const routes: ServeFunctionOptions<any, any>['routes'] = {
    '/': homePage,
    '/configure': configurePage,
    '/project/notes': notesPage,
    '/project': projectPage,

    [appInstallRedirectFromGitHub]: {
        GET(req: Request) {
            const url = new URL(req.url)
            if (
                !url.searchParams.has('setup_action') ||
                !url.searchParams.has('installation_id')
            ) {
                return new Response('Bad Request', { status: 400 })
            }
            console.debug(
                'installation setup action:',
                url.searchParams.get('setup_action'),
                url.searchParams.get('installation_id'),
            )
            return loginAndRedirect(url)
        },
    },

    [userLoginRedirectFromGitHub]: {
        GET: async (req: Request) => loginAndRedirect(new URL(req.url)),
    },

    [loginRedirectUrl]: {
        async GET() {
            // todo support login redirects with ?state=
            const state = 'abcdefg'
            const redirectURI = encodeURIComponent(
                `${process.env.WEBAPP_ADDRESS}${userLoginRedirectFromGitHub}`,
            )
            const ghUrl = `https://github.com/login/oauth/authorize?prompt=select_account&client_id=${process.env.GH_CLIENT_ID}&state=${state}&redirect_uri=${redirectURI}`
            console.debug('gh login authorize redirect', ghUrl)
            return Response.redirect(ghUrl, 302)
        },
    },

    [logoutRedirectUrl]: {
        GET(req: Request) {
            const headers: Record<string, string> = {
                'Clear-Site-Data': '"storage"',
                Location: WEBAPP_ADDRESS,
            }
            const cookie = req.headers.get('cookie')
            if (cookie) {
                const ghToken = getCookie(cookie, GH_TOKEN)
                if (ghToken) {
                    headers['Set-Cookie'] =
                        `${GH_TOKEN}=${ghToken}; Secure; SameSite=Strict; Path=/; Max-Age=0`
                }
            }
            return new Response('Found', {
                status: 302,
                headers,
            })
        },
    },

    // [WS_EVENTS_PATH]: {
    //     async GET(req: Request) {
    //         const ghLogin = await authorizedRequest(req)
    //         if (ghLogin === false) {
    //             return new Response('Unauthorized', {status: 401})
    //         } else if (server.upgrade<string>(req, {data: ghLogin})) {
    //             return
    //         } else {
    //             return new Response('Upgrade Required', {status: 426})
    //         }
    //     }
    // },

    '/lib/monaco/main.js': lib(mainWorker),
    '/lib/monaco/css.js': lib(cssWorker),
    '/lib/monaco/html.js': lib(htmlWorker),
    '/lib/monaco/json.js': lib(jsonWorker),
    '/lib/monaco/ts.js': lib(tsWorker),
    '/lib/sidelines/userData.js': lib(userDataWorker),
    '/lib/sidelines/syncRefs.js': lib(syncRefsWorker),
    '/lib/sidelines/callToActions/ghActions.js': lib(ghActionsWorker),
}

function lib(lib: Bun.BuildArtifact): Response {
    return new Response(lib, {
        headers: new Headers({ 'Content-Type': 'application/javascript' }),
    })
}

if (!PROD) {
    routes['/_data'] = (await import('./pages/_dev/data/Data.html')).default
    routes['/_ui'] = (
        await import('./pages/_dev/components/Components.html')
    ).default
}

const server = Bun.serve({
    development: !PROD,
    routes,
    fetch: async (req: Request, _server: Server) => {
        const url = new URL(req.url)
        console.log(req.method, url)
        if (!PROD && isValidGitHubRepoUrl(url)) {
            const urlParts = url.pathname.substring(1).split('/')
            const [owner, name] = urlParts
            const redirectUrl =
                urlParts.length > 2 && urlParts[2] === 'notes'
                    ? `/project/notes?owner=${owner}&name=${name}`
                    : `/project?owner=${owner}&name=${name}`
            return Response.redirect(redirectUrl, 302)
        }
        return new Response('Not Found', { status: 404 })
    },
    // websocket: new EventWebSockets(),
})

function isValidGitHubRepoUrl(url: URL): boolean {
    return /^\/[a-z\d][a-z\d-_]{0,37}[a-z\d]?\/[a-z\d._][a-z\d-._]{0,38}[a-z\d._]?(?:\/notes)?/.test(
        url.pathname,
    )
}

console.log('sidelines.dev is running at http://127.0.0.1:' + server.port)

if (!PROD) {
    console.log()
    console.log(
        `    http://127.0.0.1:${server.port}/_data`,
        `\u001b[90m${'for IndexedDB & OPFS'}\u001b[0m`,
    )
    console.log(
        `    http://127.0.0.1:${server.port}/_ui`,
        `\u001b[90m${'for UI components'}\u001b[0m`,
    )
    console.log()
}

async function loginAndRedirect(url: URL): Promise<Response> {
    const authorizationCode = url.searchParams.get('code')
    if (!authorizationCode) {
        return new Response('Bad Request', { status: 400 })
    }
    try {
        const token =
            await exchangeAuthorizationCodeForAccessToken(authorizationCode)
        return new Response('Found', {
            status: 302,
            headers: {
                Location: PROD ? `${WEBAPP_ADDRESS}/configure` : WEBAPP_ADDRESS,
                'Set-Cookie': `ght=${token.access.value}; Secure; SameSite=Strict; Path=/; Max-Age=${token.access.expiresIn}`,
            },
        })
    } catch (e) {
        console.error(e)
        return new Response('Internal Server Error', { status: 500 })
    }
}

type GHAccessToken = {
    value: string
    expiresIn: number
}

async function exchangeAuthorizationCodeForAccessToken(
    code: string,
): Promise<{ access: GHAccessToken; refresh: GHAccessToken }> {
    const response = await fetch(
        'https://github.com/login/oauth/access_token',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GH_CLIENT_ID,
                client_secret: process.env.GH_CLIENT_SECRET,
                code,
            }),
        },
    )
    if (response.status !== 200) {
        throw new Error('not 200 from gh login/oauth/access_token')
    }
    const formData = await response.formData()
    return {
        access: {
            value: formData.get('access_token')!.toString(),
            expiresIn: parseInt(formData.get('expires_in')!.toString(), 10),
        },
        refresh: {
            value: formData.get('refresh_token')!.toString(),
            expiresIn: parseInt(
                formData.get('refresh_token_expires_in')!.toString(),
                10,
            ),
        },
    }
}
