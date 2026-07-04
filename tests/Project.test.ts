import { expect, test } from '@playwright/test'
import { sidelinesObjectStoreRecords } from './idbSidelinesDev.ts'
import { login } from './login.ts'
import { userStoryProjectPage } from './project.ts'
import screenshotOnFailure from './screenshotOnFailure.ts'

test.afterEach(screenshotOnFailure)

test.describe('initializing page', () => {
    test.describe('shows public repo page', () => {
        test('without auth token', async ({ page }) => {
            await page.goto('/eighty4/l3')
            await expect(page.getByText('not logged in')).toBeVisible()
        })
    })
})

test.describe('showing package data', () => {
    test('fetches from github graphql & writes to indexeddb', async ({
        baseURL,
        context,
        page,
    }) => {
        const committedDate = new Date()
        await userStoryProjectPage({
            login: 'eighty4',
            repo: {
                owner: 'eighty4',
                name: 'l3',
            },
            defaultBranch: {
                committedDate,
            },
            packageHintContents: {
                'Cargo.toml': `[package]\nname = "l3_cli"\nversion = "0.0.1"`,
            },
        }).configureRoutes(page)
        await login(page)
        await page.goto('/eighty4/l3')
        await expect(page.getByRole('button', { name: 'Exec' })).toBeVisible()
        await expect(page.getByText('l3_cli')).toBeVisible()

        const records = await sidelinesObjectStoreRecords(baseURL!, context)
        expect(records['repo-pkgs']).toStrictEqual([
            {
                nameWithOwner: 'eighty4/l3',
                defaultBranch: 'main',
                headOid: 'abcabc12',
                committedWhen: committedDate,
                packages: [
                    {
                        name: 'l3_cli',
                        version: '0.0.1',
                        configFile: 'Cargo.toml',
                        language: 'rust',
                        path: '',
                        private: false,
                    },
                ],
            },
        ])
    })
    test('offline retrieves from indexeddb cache', async ({ page }) => {
        const committedDate = new Date()
        await userStoryProjectPage({
            login: 'eighty4',
            repo: {
                owner: 'eighty4',
                name: 'l3',
            },
            defaultBranch: {
                committedDate,
            },
            packageHintContents: {
                'Cargo.toml': `[package]\nname = "l3_cli"\nversion = "0.0.1"`,
            },
        }).configureRoutes(page)
        await login(page)
        await page.goto('/eighty4/l3')
        await expect(page.getByRole('button', { name: 'Exec' })).toBeVisible()
        await expect(page.getByText('l3_cli')).toBeVisible()

        await page.goto('/')

        await page.route('https://api.github.com/graphql', route =>
            route.abort(),
        )
        await page.goto('eighty4/l3')
        await expect(page.getByText('l3_cli')).toBeVisible()
    })
})
