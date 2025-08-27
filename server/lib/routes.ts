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

export function hasServerEnvValues(obj: any): obj is ServerEnv {
    return (
        typeof obj.GH_CLIENT_ID === 'string' &&
        typeof obj.GH_CLIENT_SECRET === 'string' &&
        typeof obj.WEBAPP_ADDRESS === 'string'
    )
}

type RouteFactories = Record<
    string,
    Partial<Record<HttpMethod, (env: ServerEnv) => RequestHandler>>
>

const routeFactories: RouteFactories = {
    '/github/redirect/app/installation': { GET: createAppInstallRedirectRoute },
    '/github/redirect/user/authorized': { GET: createLoginAndRedirectRoute },
    '/github/redirect/user/login': { GET: createRedirectToLoginRoute },

    '/logout': { GET: createLogoutRoute },
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
