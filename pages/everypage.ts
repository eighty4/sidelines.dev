import { getGhTokenCookie } from '@sidelines/data/cookie'
// import { onLoadComplete } from '@sidelines/pageload/ready'
import { SyncRefsClient } from 'Sidelines.dev/workers/syncing/SyncRefsClient'

if (dank.IS_DEV) {
    if (location.hostname === 'localhost') {
        console.warn('use ip for localhost dev')
        location.hostname = '127.0.0.1'
    }
    // if (location.port === '4000') {
    //     registerServiceWorker()
    // }

    // const dataLink = document.createElement('a')
    // dataLink.style.cursor = 'pointer'
    // dataLink.style.color = '#282'
    // dataLink.style.background = '#ccc'
    // dataLink.style.width = '4rem'
    // dataLink.style.height = '2rem'
    // dataLink.style.fontSize = '.8rem'
    // dataLink.style.display = 'flex'
    // dataLink.style.alignItems = 'center'
    // dataLink.style.justifyContent = 'center'
    // dataLink.style.position = 'fixed'
    // dataLink.style.left = '0'
    // dataLink.style.bottom = '0'
    // dataLink.innerText = '/_data'
    // dataLink.target = '_blank'
    // dataLink.href = dataLink.innerText

    // document.body.appendChild(dataLink)
}

// if (dank.IS_PROD) {
//     onLoadComplete(registerServiceWorker)
// }

registerSyncWorker()

function registerSyncWorker() {
    const ghToken = getGhTokenCookie(document.cookie)
    if (!ghToken) {
        return
    }
    new SyncRefsClient(ghToken)
}

// recent chrome versions do not HTTP cache service workers
//  unless explicitly done so with Cache-Control
// for previous chrome versions or user agents, use a header
//  to disable HTTP caching of the service worker
// function registerServiceWorker() {
//     navigator.serviceWorker
//         .register('/sidelines.sw.js', { scope: '/' })
//         .then(registration => {
//             registration.onupdatefound = () => {
//                 registration
//                     .update()
//                     .catch(e => console.error('sw update error', e))
//             }
//         })
//         .catch(e => console.error('sw registration error', e))
// }
