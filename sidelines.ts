import { GH_TOKEN, getCookie } from './cookie.ts'
import configurePage from './public/configure/configure.html'
import homePage from './public/home.html'
import loginPage from './public/login.html'
import projectPage from './public/project/project.html'

const server = Bun.serve({
  port: 3000,
  development: true,
  static: {
    '/': homePage,
    '/configure': configurePage,
    '/login': loginPage,
    '/project': projectPage,
  },
  fetch(req) {
    const url = new URL(req.url)
    console.log(req.method, url.pathname)
    switch (url.pathname) {
      case '/installation/setup':
        return acceptInstallationRedirect(req, url)
      case '/login/redirect':
        return redirectToLogin(req)
      case '/login/authorized':
        return acceptLoginRedirect(req, url)
      case '/logout':
        return logoutRedirect(req)
      default:
        return new Response('Not Found', { status: 404 })
    }
  },
})

console.log('sidelines.dev is running at http://127.0.0.1:' + server.port)

function logoutRedirect(req: Request): Response {
  const headers: Record<string, string> = {
    'Clear-Site-Data': '"storage"',
    'Location': 'http://127.0.0.1:3000/',
  }
  const cookie = req.headers.get('cookie')
  if (cookie) {
    const ghToken = getCookie(cookie, GH_TOKEN)
    if (ghToken) {
      headers['Set-Cookie'] = `${GH_TOKEN}=${ghToken}; Secure; SameSite=Strict; Path=/; Max-Age=0`
    }
  }
  return new Response('Found', {
    status: 302,
    headers,
  })
}

async function redirectToLogin(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  const ghUrl = `https://github.com/login/oauth/authorize?prompt=select_account&client_id=${process.env.GH_CLIENT_ID}&state=abcdefg&redirect_uri=${encodeURIComponent(process.env.GH_REDIRECT_URI!)}`
  console.debug('gh login authorize redirect', ghUrl)
  return Response.redirect(ghUrl, 302)
}

async function acceptInstallationRedirect(req: Request, url: URL): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  if (!url.searchParams.has('setup_action') || !url.searchParams.has('installation_id')) {
    return new Response('Bad Request', { status: 400 })
  }
  console.debug(
    'installation setup action:',
    url.searchParams.get('setup_action'),
    url.searchParams.get('installation_id'),
  )
  return loginAndRedirectToConfigurePage(url)
}

async function acceptLoginRedirect(req: Request, url: URL): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  return loginAndRedirectToConfigurePage(url)
}

async function loginAndRedirectToConfigurePage(url: URL): Promise<Response> {
  const authorizationCode = url.searchParams.get('code')
  if (!authorizationCode) {
    return new Response('Bad Request', { status: 400 })
  }
  try {
    const token = await exchangeAuthorizationCodeForAccessToken(authorizationCode)
    return new Response('Found', {
      status: 302,
      headers: {
        'Location': 'http://127.0.0.1:3000/configure',
        'Set-Cookie': `ght=${token.access.value}; Secure; SameSite=Strict; Path=/; Max-Age=${token.access.expiresIn}`,
      }
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

async function exchangeAuthorizationCodeForAccessToken(code: string): Promise<{ access: GHAccessToken, refresh: GHAccessToken }> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GH_CLIENT_ID,
      client_secret: process.env.GH_CLIENT_SECRET,
      code,
    }),
  })
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
      expiresIn: parseInt(formData.get('refresh_token_expires_in')!.toString(), 10),
    }
  }
}
