import 'react'
import type { SidelinesGlobal } from './dev/define.ts'

declare module 'react' {
    interface CSSProperties {
        [key: `--${string}`]: string | number
    }
}

declare global {
    var sidelines: SidelinesGlobal
}
