export function onDomInteractive(fn: () => void) {
    console.log('pageload', location.pathname)
    if (document.readyState !== 'loading') {
        fn()
    } else {
        document.addEventListener('DOMContentLoaded', fn)
    }
}

export function onLoadComplete(fn: () => void) {
    if (document.readyState === 'complete') {
        fn()
    } else {
        window.addEventListener('load', fn)
    }
}
