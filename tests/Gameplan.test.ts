import { expect, test } from '@playwright/test'
import { GH_TOKEN } from '@sidelines/data/cookie'
import type { QViewerAndExplicitRepoHeadOidsGraph } from '@sidelines/github/GRAPHS'
import { login, userStoryWithSidelinesRepo } from './login.ts'
import screenshotOnFailure from './screenshotOnFailure.ts'

test.afterEach(screenshotOnFailure)

test.describe('initializing page', () => {
    test.describe('redirects to login', () => {
        test(
            'without auth token',
            { tag: '@clearSiteData' },
            async ({ page }) => {
                await page.goto('/gameplan')
                await page.waitForURL('/')
            },
        )
        test.describe('with invalid auth token', () => {
            test('and without session stored username', async ({
                baseURL,
                context,
                page,
            }) => {
                await context.addCookies([
                    {
                        name: GH_TOKEN,
                        value: 'yeehaw',
                        path: '/',
                        secure: true,
                        sameSite: 'Strict',
                        domain: new URL(baseURL!).host,
                    },
                ])
                await userStoryWithSidelinesRepo().configureRoutes(page)
                await page.goto('/gameplan')
                await page.waitForURL('/')
                expect(
                    await page.evaluate(
                        cookie => window.cookieStore.get(cookie),
                        GH_TOKEN,
                    ),
                ).toBeNull()
            })
            test.skip('and with session stored username', async ({
                baseURL,
                context,
                page,
            }) => {
                await context.addCookies([
                    {
                        name: GH_TOKEN,
                        value: 'yeehaw',
                        path: '/',
                        secure: true,
                        sameSite: 'Strict',
                        domain: new URL(baseURL!).host,
                    },
                ])
                await context.addInitScript(() => {
                    window.sessionStorage.setItem(
                        'sld.user.gh.login',
                        'eighty4',
                    )
                })
                await page.goto('/gameplan')
                await page.waitForURL('/')
            })
        })
    })
})

test.describe('job list', () => {
    test('exec button click disables button', async ({ page }) => {
        await userStoryWithSidelinesRepo()
            .withGraphqlResponse('QViewerAndExplicitRepoHeadOids', null, {
                viewer: {
                    repositories: {
                        nodes: [],
                        pageInfo: {
                            endCursor: null,
                            hasNextPage: false,
                        },
                    },
                },
            } satisfies QViewerAndExplicitRepoHeadOidsGraph)
            .configureRoutes(page)
        await login(page)
        const execButton = page.getByRole('button', { name: 'Exec' })
        await expect(execButton).toBeVisible()
        await execButton.click()
        await expect(execButton).toBeDisabled()
    })
})
