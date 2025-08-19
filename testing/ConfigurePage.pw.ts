import { expect, test } from '@playwright/test'
import { UserStory } from './github/UserStory.ts'

test('/configure redirects to /gameplan when GH app and .sidelines repo are good', async ({
    page,
}) => {
    await UserStory.login('eighty4')
        .withAppInstallation({ id: 1234567, repos: 'all' })
        .withGraphqlResponse('ViewerLogin', null, {
            viewer: { login: 'eighty4' },
        })
        .withGraphqlResponse('CheckSidelinesRepo', null, {
            viewer: {
                repository: {
                    nameWithOwner: 'eighty4/.sidelines',
                    homepageUrl: 'https://sidelines.dev',
                    isPrivate: true,
                },
            },
        })
        .configureRoutes(page)

    await page.goto('/')
    await page.getByText('Login').click()
    await page.waitForURL('/configure')
    await page.waitForURL('/gameplan')
})

test('/configure notifies when GH app is not installed', async ({ page }) => {
    await UserStory.login('eighty4')
        .withGraphqlResponse('ViewerLogin', null, {
            viewer: { login: 'eighty4' },
        })
        .configureRoutes(page)

    await page.goto('/')
    await page.getByText('Login').click()
    await page.waitForURL('/configure')
    const installAppCallToAction = page.getByText('Install the GitHub app')
    await expect(installAppCallToAction).toBeVisible()
    expect(await installAppCallToAction.getAttribute('href')).toBe(
        'https://github.com/apps/sidelines-dev-dev',
    )
})

test('/configure notifies when GH app is not installed for all apps', async ({
    page,
}) => {
    await UserStory.login('eighty4')
        .withAppInstallation({ id: 1234567, repos: 'selected' })
        .withGraphqlResponse('ViewerLogin', null, {
            viewer: { login: 'eighty4' },
        })
        .configureRoutes(page)

    await page.goto('/')
    await page.getByText('Login').click()
    await page.waitForURL('/configure')
    const installAppCallToAction = page.getByText(
        'Configure the GitHub app for all repositories',
    )
    await expect(installAppCallToAction).toBeVisible()
    expect(await installAppCallToAction.getAttribute('href')).toBe(
        'https://github.com/settings/installations/1234567',
    )
})

test('/configure notifies when .sidelines has bad url', async ({ page }) => {
    await UserStory.login('eighty4')
        .withAppInstallation({ id: 1234567, repos: 'all' })
        .withGraphqlResponse('ViewerLogin', null, {
            viewer: { login: 'eighty4' },
        })
        .withGraphqlResponse('CheckSidelinesRepo', null, {
            viewer: {
                repository: {
                    nameWithOwner: 'eighty4/.sidelines',
                    homepageUrl: 'sidelines haxor',
                    isPrivate: true,
                },
            },
        })
        .configureRoutes(page)

    await page.goto('/')
    await page.getByText('Login').click()
    await page.waitForURL('/configure')
    await expect(page.getByText('clashing')).toBeVisible()
})

test('/configure notifies when .sidelines is not private', async ({ page }) => {
    await UserStory.login('eighty4')
        .withAppInstallation({ id: 1234567, repos: 'all' })
        .withGraphqlResponse('ViewerLogin', null, {
            viewer: { login: 'eighty4' },
        })
        .withGraphqlResponse('CheckSidelinesRepo', null, {
            viewer: {
                repository: {
                    nameWithOwner: 'eighty4/.sidelines',
                    homepageUrl: 'https://sidelines.dev',
                    isPrivate: false,
                },
            },
        })
        .configureRoutes(page)

    await page.goto('/')
    await page.getByText('Login').click()
    await page.waitForURL('/configure')
    await expect(page.getByText('!!!')).toBeVisible()
})
