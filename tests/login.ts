import type { Page } from '@playwright/test'
import type { QCheckSidelinesRepoGraph } from '@sidelines/github/GRAPHS'
import { UserStory } from './github/UserStory.ts'

export async function login(
    page: Page,
    awaitDestination?: '/configure' | '/gameplan',
) {
    await page.goto('/')
    await page.getByText('Login').click()
    await page.waitForURL('/configure')
    if (awaitDestination === '/configure') {
        return
    }
    await page.waitForURL('/gameplan')
}

type LoginWithoutAppInstall = {
    ghLogin?: string
}

export function userStoryWithoutSidelinesApp(opts?: LoginWithoutAppInstall) {
    const login = opts?.ghLogin || 'eighty4'
    return new UserStory().withGraphqlResponse('QViewerLogin', null, {
        viewer: { login },
    })
}

type LoginWithoutSidelinesRepoOpts = LoginWithoutAppInstall & {
    sidelinesApp?: {
        repos?: 'all' | 'selected'
    }
}

export function userStoryWithoutSidelinesRepo(
    opts?: LoginWithoutSidelinesRepoOpts,
): UserStory {
    return userStoryWithoutSidelinesApp(opts).withAppInstallation({
        id: 1234567,
        repos: opts?.sidelinesApp?.repos ?? 'all',
    })
}

type LoginWithSidelinesRepoOpts = LoginWithoutSidelinesRepoOpts & {
    sidelinesRepo?: {
        homepage?: `https://${string}`
        private?: boolean
    }
}

export function userStoryWithSidelinesRepo(
    opts?: LoginWithSidelinesRepoOpts,
): UserStory {
    return userStoryWithoutSidelinesRepo(opts).withGraphqlResponse(
        'QCheckSidelinesRepo',
        null,
        {
            viewer: {
                repository: {
                    homepageUrl:
                        opts?.sidelinesRepo?.homepage ??
                        'https://sidelines.dev',
                    isPrivate: opts?.sidelinesRepo?.private ?? true,
                },
            },
        } satisfies QCheckSidelinesRepoGraph,
    )
}
