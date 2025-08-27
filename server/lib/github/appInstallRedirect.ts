import { createLoginAndRedirectHandler } from './authExchangeRedirect.ts'
import type { ServerEnv } from '../routes.ts'

export function createAppInstallRedirectRoute(env: ServerEnv) {
    const loginAndRedirect = createLoginAndRedirectHandler(env)
    return (req: Request) => {
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
    }
}
