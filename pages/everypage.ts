import { onLoadComplete } from './init.ts'

if (sidelines.IS_DEV) {
    if (location.hostname === 'localhost') {
        console.warn('use ip for localhost dev')
        location.hostname = '127.0.0.1'
    }
    if (location.port === '4000') {
        registerServiceWorker()
    } else {
        type EsbuildEvent = {
            added: Array<any>
            updated: Array<any>
            removed: Array<string>
        }
        new EventSource('http://127.0.0.1:2999/esbuild').addEventListener(
            'change',
            (e: MessageEvent) => {
                const change: EsbuildEvent = JSON.parse(e.data)
                console.log('esbuild update', change)
                const indicator = document.createElement('div')
                indicator.style.border = '6px dashed orange'
                indicator.style.zIndex = '9000'
                indicator.style.position = 'fixed'
                indicator.style.top = indicator.style.left = '1px'
                indicator.style.height = indicator.style.width =
                    'calc(100% - 2px)'
                indicator.style.boxSizing = 'border-box'
                document.body.appendChild(indicator)
            },
        )
    }
}

if (sidelines.IS_PROD) {
    onLoadComplete(registerServiceWorker)
}

// recent chrome versions do not HTTP cache service workers
//  unless explicitly done so with Cache-Control
// for previous chrome versions or user agents, use a header
//  to disable HTTP caching of the service worker
function registerServiceWorker() {
    navigator.serviceWorker
        .register('/sidelines.sw.js', { scope: '/' })
        .then(registration => {
            registration.onupdatefound = () => {
                registration
                    .update()
                    .catch(e => console.error('sw update error', e))
            }
        })
        .catch(e => console.error('sw registration error', e))
}
