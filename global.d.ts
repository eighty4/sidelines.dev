import 'react'

declare module 'react' {
    interface CSSProperties {
        [key: `--${string}`]: string | number
    }
}

declare global {
    var dank: {
        IS_PROD: boolean
        IS_DEV: boolean
    }
}
