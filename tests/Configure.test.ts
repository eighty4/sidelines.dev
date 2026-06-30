import { expect, test } from '@playwright/test'
import type { QViewerAndExplicitRepoHeadOidsGraph } from '@sidelines/github/GRAPHS'
import {
    login,
    userStoryWithoutSidelinesApp,
    userStoryWithoutSidelinesRepo,
    userStoryWithSidelinesRepo,
} from './login.ts'
import screenshotOnFailure from './screenshotOnFailure.ts'

test.afterEach(screenshotOnFailure)

test('/configure redirects to /gameplan when GH app and .sidelines repo are good', async ({
    page,
}) => {
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
    await expect(page).toHaveURL('/gameplan')
})

test('/configure notifies when GH app is not installed', async ({ page }) => {
    await userStoryWithoutSidelinesApp()
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
    await login(page, '/configure')

    const installAppCallToAction = page.getByText('Install the GitHub app')
    await expect(installAppCallToAction).toBeVisible()
    expect(await installAppCallToAction.getAttribute('href')).toBe(
        'https://github.com/apps/sidelines-dev-dev',
    )
})

test('/configure notifies when GH app is not installed for all apps', async ({
    page,
}) => {
    await userStoryWithoutSidelinesRepo({
        sidelinesApp: { repos: 'selected' },
    })
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
    await login(page, '/configure')

    const installAppCallToAction = page.getByText(
        'Configure the GitHub app for all repositories',
    )
    await expect(installAppCallToAction).toBeVisible()
    expect(await installAppCallToAction.getAttribute('href')).toBe(
        'https://github.com/settings/installations/1234567',
    )
})

test('/configure notifies when .sidelines has bad url', async ({ page }) => {
    await userStoryWithSidelinesRepo({
        sidelinesRepo: {
            homepage: 'https://sidelines.haxor',
        },
    })
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
    await login(page, '/configure')

    await expect(page.getByText('clashing')).toBeVisible()
})

test('/configure notifies when .sidelines is not private', async ({ page }) => {
    await userStoryWithSidelinesRepo({
        sidelinesRepo: {
            private: false,
        },
    })
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
    await login(page, '/configure')

    await expect(page.getByText('!!!')).toBeVisible()
})
