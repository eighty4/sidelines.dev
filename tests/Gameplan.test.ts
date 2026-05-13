import { expect, test } from '@playwright/test'
import { GH_TOKEN } from '@sidelines/data/cookie'
import { login } from './login.ts'
import screenshotOnFailure from './screenshotOnFailure.ts'
import { UserStory } from './github/UserStory.ts'

test.afterEach(screenshotOnFailure)

test.describe('initializing page', () => {
    test.describe('redirects to login', () => {
        test('without auth token', async ({ page }) => {
            await page.goto('/gameplan')
            await page.waitForURL('/')
        })
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
                await UserStory.login('eighty4')
                    .withGraphqlResponse('QViewerLogin', null, {
                        viewer: { login: 'eighty4' },
                    })
                    .configureRoutes(page)
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
        await loginToGameplanUserStory().configureRoutes(page)
        await login(page)
        const execButton = page.getByRole('button', { name: 'Exec' })
        await expect(execButton).toBeVisible()
        await execButton.click()
        await expect(execButton).toBeDisabled()
    })
})

function loginToGameplanUserStory(): UserStory {
    return UserStory.login('eighty4')
        .withAppInstallation({ id: 1234567, repos: 'all' })
        .withGraphqlResponse('QViewerLogin', null, {
            viewer: { login: 'eighty4' },
        })
        .withGraphqlResponse('QCheckSidelinesRepo', null, {
            viewer: {
                repository: {
                    nameWithOwner: 'eighty4/.sidelines',
                    homepageUrl: 'https://sidelines.dev',
                    isPrivate: true,
                },
            },
        })
}

// // for sync refs shared worker
// .withGraphqlResponse('QViewerRepoDefaultBranch', null, {
//     viewer: {
//         repositories: {
//             nodes: [
//                 {
//                     name: 'l3',
//                     owner: { login: 'eighty4' },
//                     defaultBranchRef: {
//                         target: {
//                             history: {
//                                 edges: [{ node: { oid: '6773aaca' } }],
//                             },
//                         },
//                     },
//                 },
//             ],
//             pageInfo: {
//                 endCursor: 'asdf',
//                 hasNextPage: false,
//             },
//         },
//     },
// })
