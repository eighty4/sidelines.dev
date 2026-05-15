import type { BrowserContext } from '@playwright/test'

export function isWebKit(context: BrowserContext): boolean {
    return context.browser()?.browserType().name() === 'webkit'
}
