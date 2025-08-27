import type { ServerEnv } from '../routes.ts'

type GHAuthedTokens = { access: GHAccessToken; refresh: GHAccessToken }

type GHAccessToken = {
    value: string
    expiresIn: number
}

export function createLoginAndRedirectRoute(env: ServerEnv) {
    return (req: Request) => loginAndRedirect(env, new URL(req.url))
}

export function createLoginAndRedirectHandler(env: ServerEnv) {
    return (url: URL) => loginAndRedirect(env, url)
}

async function loginAndRedirect(env: ServerEnv, url: URL): Promise<Response> {
    const authorizationCode = url.searchParams.get('code')
    if (!authorizationCode) {
        return new Response('Bad Request', { status: 400 })
    }
    try {
        const tokens = await exchangeAuthorizationCodeForAccessToken(
            env,
            authorizationCode,
        )
        return authedRedirectResponse(env.WEBAPP_ADDRESS, tokens)
    } catch (e) {
        console.error(e)
        return new Response('Internal Server Error', { status: 500 })
    }
}

export function authedRedirectResponse(
    webappAddress: ServerEnv['WEBAPP_ADDRESS'],
    tokens: GHAuthedTokens,
): Response {
    return new Response('Found', {
        status: 302,
        headers: {
            Location: webappAddress + '/configure',
            'Set-Cookie': `ght=${tokens.access.value}; Secure; SameSite=Strict; Path=/; Max-Age=${tokens.access.expiresIn}`,
        },
    })
}

async function exchangeAuthorizationCodeForAccessToken(
    env: ServerEnv,
    code: string,
): Promise<GHAuthedTokens> {
    const response = await fetch(
        'https://github.com/login/oauth/access_token',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: env.GH_CLIENT_ID,
                client_secret: env.GH_CLIENT_SECRET,
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
