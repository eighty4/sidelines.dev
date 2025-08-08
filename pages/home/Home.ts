import { getUserDataClient } from '../init.ts'
import { buildProjectUrl, loginRedirectUrl } from '../nav.ts'

const userData = await getUserDataClient()
if (userData === null) {
    createLink(loginRedirectUrl, 'Login')
} else {
    const sw = new SharedWorker('/lib/sidelines/eventStream.js', {name: 'sidelines.dev events'})
    sw.port.start()

    createLink('/configure', 'Configure')
    for (const repo of await userData.navHistory()) {
        createLink(buildProjectUrl(repo), `Project ${repo.owner}/${repo.name}`)
    }
    createLink('/logout', 'Logout')
}

function createLink(href: string, text: string) {
    const a = document.createElement('a')
    a.href = href
    a.innerText = text
    document.body.appendChild(a)
}
