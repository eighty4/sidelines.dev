import logout from './logout.ts'
import appInstallRedirect from './github/appInstallRedirect.ts'
import authExchangeRedirect from './github/authExchangeRedirect.ts'
import redirectToLogin from './github/redirectToLogin.ts'

export type HttpMethod = 'GET' | 'POST'

export type RequestHandler = (req: Request) => Response | Promise<Response>

export type RoutesByMethod = Record<
    string,
    Partial<Record<HttpMethod, RequestHandler>>
>

export const routes: RoutesByMethod = {
    '/github/redirect/app/installation': { GET: appInstallRedirect },
    '/github/redirect/user/authorized': { GET: authExchangeRedirect },
    '/github/redirect/user/login': { GET: redirectToLogin },

    '/logout': { GET: logout },
}

export const paths = Object.keys(routes)
