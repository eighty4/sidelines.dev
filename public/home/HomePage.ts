import { getUserLogin } from '@eighty4/sidelines-github'
import { getCookie, GH_TOKEN } from '../../cookie.ts'
import { ghLoginCache, projectHistoryCache } from '../storage.ts'

getGhLogin().then(ghLogin => {
    if (ghLogin) {
        createLink('/configure', 'Configure')
        projectHistoryCache
            .read()
            ?.forEach(repo =>
                createLink(
                    '/project?name=' + repo,
                    `Project ${ghLogin}/${repo}`,
                ),
            )
        createLink('/logout', 'Logout')
    } else {
        createLink('/login/redirect', 'Login')
    }
})

async function getGhLogin(): Promise<string | null> {
    const ghToken = getCookie(document.cookie, GH_TOKEN)
    if (ghToken) {
        try {
            const ghLogin = await getUserLogin(ghToken)
            ghLoginCache.write(ghLogin)
            return ghLogin
        } catch (e) {
            console.error(e)
        }
    }
    return null
}

function createLink(href: string, text: string) {
    const a = document.createElement('a')
    a.href = href
    a.innerText = text
    a.style.display = 'block'
    a.style.padding = '.35rem 1rem'
    document.body.appendChild(a)
}
