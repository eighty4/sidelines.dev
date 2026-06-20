import { createLogoutRoute } from './logout.ts'
import { createAppInstallRedirectRoute } from './github/appInstallRedirect.ts'
import { createLoginAndRedirectRoute } from './github/authExchangeRedirect.ts'
import { createRedirectToLoginRoute } from './github/redirectToLogin.ts'

export type HttpMethod = 'GET' | 'POST'

export type RequestHandler = (req: Request) => Response | Promise<Response>

export type RoutesByMethod = Record<
    string,
    Partial<Record<HttpMethod, RequestHandler>>
>

export type ServerEnv = {
    GH_CLIENT_ID: string
    GH_CLIENT_SECRET: string
    WEBAPP_ADDRESS: string
}

export function hasServerEnvValues(env: unknown): env is ServerEnv {
    return (
        env !== null &&
        typeof env === 'object' &&
        'GH_APP_ID' in env &&
        isString(env.GH_APP_ID) &&
        'GH_CLIENT_ID' in env &&
        isString(env.GH_CLIENT_ID) &&
        'GH_CLIENT_SECRET' in env &&
        isString(env.GH_CLIENT_SECRET) &&
        'WEBAPP_ADDRESS' in env &&
        isString(env.WEBAPP_ADDRESS)
    )
}

function isString(v: unknown): v is string {
    return typeof v === 'string' && v.length > 0
}

type RouteFactories = Record<
    string,
    Partial<Record<HttpMethod, (env: ServerEnv) => RequestHandler>>
>

const routeFactories: RouteFactories = {
    '/github/redirect/app/installation': { GET: createAppInstallRedirectRoute },
    '/github/redirect/user/authorized': { GET: createLoginAndRedirectRoute },
    '/github/redirect/user/login': { GET: createRedirectToLoginRoute },

    '/logout': { POST: createLogoutRoute },
}

export function createRoutes(env: ServerEnv): RoutesByMethod {
    const routes: RoutesByMethod = {}
    for (const [p, routesByMethod] of Object.entries(routeFactories)) {
        routes[p] = {}
        for (const [method, route] of Object.entries(routesByMethod)) {
            routes[p][method as HttpMethod] = route(env)
        }
    }
    return routes
}

export function createRoute(
    env: ServerEnv,
    url: URL,
    method: HttpMethod,
): RequestHandler | 404 | 405 {
    console.log('create route', url.pathname, method)
    if (routeFactories[url.pathname]) {
        const routeFactory = routeFactories[url.pathname][method]
        if (routeFactory) {
            return routeFactory(env)
        } else {
            return 405
        }
    } else {
        return 404
    }
}

export const paths = Object.keys(routeFactories)
