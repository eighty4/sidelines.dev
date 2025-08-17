export default (req: Request) => loginAndRedirect(new URL(req.url))

export async function loginAndRedirect(url: URL): Promise<Response> {
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
                Location: Bun.env.WEBAPP_ADDRESS + '/configure',
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
                client_id: Bun.env.GH_CLIENT_ID,
                client_secret: Bun.env.GH_CLIENT_SECRET,
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
