import { onLoadComplete } from '@sidelines/pageload'

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
                const cssUpdates = change.updated.filter(p =>
                    p.endsWith('.css'),
                )
                if (cssUpdates.length) {
                    console.log('esbuild css updates', cssUpdates)
                    const cssLinks: Record<string, HTMLLinkElement> = {}
                    for (const elem of document.getElementsByTagName('link')) {
                        if (elem.getAttribute('rel') === 'stylesheet') {
                            const url = new URL(elem.href)
                            if ((url.host = location.host)) {
                                cssLinks[url.pathname] = elem
                            }
                        }
                    }
                    let swappedCss: boolean = false
                    for (const cssUpdate of cssUpdates) {
                        const cssLink = cssLinks[cssUpdate]
                        if (cssLink) {
                            const next = cssLink.cloneNode() as HTMLLinkElement
                            next.href = `${cssUpdate}?${Math.random().toString(36).slice(2)}`
                            next.onload = () => cssLink.remove()
                            cssLink.parentNode!.insertBefore(
                                next,
                                cssLink.nextSibling,
                            )
                            swappedCss = true
                        }
                    }
                    if (swappedCss) {
                        addCssUpdateIndicator()
                    }
                }
                if (cssUpdates.length < change.updated.length) {
                    const jsUpdates = change.updated.filter(
                        p => !p.endsWith('.css'),
                    )
                    const jsScripts: Set<string> = new Set()
                    for (const elem of document.getElementsByTagName(
                        'script',
                    )) {
                        const url = new URL(elem.src)
                        if ((url.host = location.host)) {
                            jsScripts.add(url.pathname)
                        }
                    }
                    if (jsUpdates.some(jsUpdate => jsScripts.has(jsUpdate))) {
                        console.log('esbuild js updates require reload')
                        addJsReloadIndicator()
                    }
                }
            },
        )
    }
}

function addCssUpdateIndicator() {
    const indicator = createUpdateIndicator('green', '9999')
    indicator.style.transition = 'opacity ease-in-out .38s'
    indicator.style.opacity = '0'
    indicator.ontransitionend = () => {
        if (indicator.style.opacity === '1') {
            indicator.style.opacity = '0'
        } else {
            indicator.remove()
            indicator.onload = null
            indicator.ontransitionend = null
        }
    }
    document.body.appendChild(indicator)
    setTimeout(() => (indicator.style.opacity = '1'), 0)
}

function addJsReloadIndicator() {
    document.body.appendChild(createUpdateIndicator('orange', '9000'))
}

function createUpdateIndicator(
    color: 'green' | 'orange',
    zIndex: '9000' | '9999',
): HTMLDivElement {
    const indicator = document.createElement('div')
    indicator.style.border = '6px dashed ' + color
    indicator.style.zIndex = zIndex
    indicator.style.position = 'fixed'
    indicator.style.top = indicator.style.left = '1px'
    indicator.style.height = indicator.style.width = 'calc(100% - 2px)'
    indicator.style.boxSizing = 'border-box'
    return indicator
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
