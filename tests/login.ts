import type { Page } from '@playwright/test'

export async function login(page: Page) {
    await page.goto('/')
    await page.getByText('Login').click()
    await page.waitForURL('/configure')
    await page.waitForURL('/gameplan')
}
