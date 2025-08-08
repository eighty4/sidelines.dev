import { getUserDataClient } from '../init.ts'
import { buildProjectUrl, loginRedirectUrl } from '../nav.ts'

const userData = await getUserDataClient()
if (userData === null) {
    createLink(loginRedirectUrl, 'Login')
} else {
    const sw = new SharedWorker('/lib/sidelines/syncRefs.js', {
        name: 'sidelines.dev events',
    })
    sw.port.start()
    sw.port.postMessage({ kind: 'init', ghToken: userData.ghToken })

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
