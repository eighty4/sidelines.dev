import { onDomInteractive } from '@sidelines/pageload/ready'
import { lookupGhToken } from '@sidelines/pageload/session'
import { UserDataClient } from '../../workers/userData/UserDataClient.ts'
import { buildProjectUrl, loginRedirectUrl } from '../nav.ts'

onDomInteractive(async () => {
    const ghToken = lookupGhToken()
    if (ghToken === null) {
        createLink(loginRedirectUrl, 'Login')
    } else {
        const userData = new UserDataClient(ghToken)
        createLink('/configure', 'Configure')
        createLink('/gameplan', 'Gameplan')
        createLink('/watches', 'Watches')
        for (const repo of await userData.navHistory()) {
            createLink(
                buildProjectUrl(repo),
                `Project ${repo.owner}/${repo.name}`,
            )
        }
        createLogoutButton()
    }
})

function createLink(href: string, text: string) {
    const a = document.createElement('a')
    a.href = href
    a.innerText = text
    document.body.appendChild(a)
}

function createLogoutButton() {
    document.body.insertAdjacentHTML(
        'beforeend',
        `<form action="/logout" method="POST"><button type="submit">Logout</button></form>`,
    )
}
