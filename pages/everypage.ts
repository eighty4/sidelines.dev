import { ghTokenFromCookie } from '@sidelines/data/cookie'
// import { onLoadComplete } from '@sidelines/pageload/ready'
import startJobSchedulingWorker from '../workers/jobs/startJobsSWorker.ts'
import { PageSideWorkerLauncher } from '../workers/WorkerLaunch.ts'

if (dank.IS_DEV) {
    if (location.hostname === 'localhost') {
        console.warn('use ip for localhost dev')
        location.hostname = '127.0.0.1'
    }
    // if (location.port === '4000') {
    //     registerServiceWorker()
    // }
}

// if (dank.IS_PROD) {
//     onLoadComplete(registerServiceWorker)
// }

const ghToken = ghTokenFromCookie(document.cookie)
if (ghToken) {
    const workerLauncher = new PageSideWorkerLauncher()
    window.addEventListener('beforeunload', () => workerLauncher.shutdown())
    if (location.pathname !== '/configure') {
        startJobSchedulingWorker(ghToken)
    }
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
