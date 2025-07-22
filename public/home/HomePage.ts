import { getUserDataClient } from '../init.js'
import { buildProjectUrl } from '../nav.js'

const userData = await getUserDataClient()
if (userData === null) {
    createLink('/login/redirect', 'Login')
} else {
    createLink('/configure', 'Configure')
    for (const repo of await userData.navHistory()) {
        createLink(buildProjectUrl(repo), `Project ${repo.owner}/${repo.name}`)
    }
}

function createLink(href: string, text: string) {
    const a = document.createElement('a')
    a.href = href
    a.innerText = text
    document.body.appendChild(a)
}
