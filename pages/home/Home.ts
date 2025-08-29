import { onDomInteractive } from '@sidelines/pageload'
import { getUserDataClient } from '../expectUserData.ts'
import { buildProjectUrl, loginRedirectUrl } from '../nav.ts'

onDomInteractive(async () => {
    const userData = await getUserDataClient()
    if (userData === null) {
        createLink(loginRedirectUrl, 'Login')
    } else {
        const sw = new SharedWorker(sidelines.worker.SYNC_REFS, {
            name: 'sidelines.dev events',
        })
        sw.port.postMessage({ kind: 'init', ghToken: userData.ghToken })

        createLink('/configure', 'Configure')
        for (const repo of await userData.navHistory()) {
            createLink(
                buildProjectUrl(repo),
                `Project ${repo.owner}/${repo.name}`,
            )
        }
        createLink('/logout', 'Logout')
    }
})

function createLink(href: string, text: string) {
    const a = document.createElement('a')
    a.href = href
    a.innerText = text
    document.body.appendChild(a)
}
