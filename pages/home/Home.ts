import { onDomInteractive } from '@sidelines/pageload/ready'
import { getUserDataClient } from '../expectUserData.ts'
import { buildProjectUrl, loginRedirectUrl } from '../nav.ts'

onDomInteractive(async () => {
    const userData = await getUserDataClient()
    if (userData === null) {
        createLink(loginRedirectUrl, 'Login')
    } else {
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
