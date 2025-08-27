import type { ServerEnv } from '../routes.ts'

export function createRedirectToLoginRoute(env: ServerEnv) {
    return () => {
        // todo support login redirects with ?state=
        const state = 'abcdefg'
        const redirectURI = encodeURIComponent(
            env.WEBAPP_ADDRESS + '/github/redirect/user/authorized',
        )
        const ghUrl = `https://github.com/login/oauth/authorize?prompt=select_account&client_id=${env.GH_CLIENT_ID}&state=${state}&redirect_uri=${redirectURI}`
        console.debug('gh login authorize redirect', ghUrl)
        return Response.redirect(ghUrl, 302)
    }
}
