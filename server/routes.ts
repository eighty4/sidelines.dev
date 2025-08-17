import type { ServeFunctionOptions } from 'bun'
import logout from './logout.ts'
import appInstallRedirect from './github/appInstallRedirect.ts'
import authExchangeRedirect from './github/authExchangeRedirect.ts'
import redirectToLogin from './github/redirectToLogin.ts'

export const routes: ServeFunctionOptions<any, any>['routes'] = {
    '/github/redirect/app/installation': { GET: appInstallRedirect },
    '/github/redirect/user/authorized': { GET: authExchangeRedirect },
    '/github/redirect/user/login': { GET: redirectToLogin },

    '/logout': { GET: logout },
}

export const paths = Object.keys(routes)
