import { basename, dirname } from 'node:path/posix'
import { expect, type Page, test } from '@playwright/test'
import { UserStory } from '$testing/github/UserStory.ts'
import { login } from '$testing/sidelines/login.ts'
import type { RepositoryId } from '@sidelines/model'

test.describe('PathSearchInput', () => {
    test.describe('pasting urls', () => {
        // creates a tree or blob gh url
        function repoObjUrl(
            owner: string,
            repo: string,
            tOrB: 'tree' | 'blob',
            path: string,
        ): string {
            return `https://github.com/${owner}/${repo}/${tOrB}/main/${path}`
        }

        // dispatches ClipboardEvent in the browser on the page's active element
        async function paste(page: Page, pasting: string) {
            await page.evaluate(data => {
                if (!document.activeElement)
                    throw Error('need to focus an element')
                const clipboardData = new DataTransfer()
                clipboardData.setData('text/plain', data)
                document.activeElement.dispatchEvent(
                    new ClipboardEvent('paste', {
                        clipboardData,
                        bubbles: true,
                        cancelable: true,
                    }),
                )
            }, pasting)
        }

        test('pasting blob url', async ({ page }) => {
            const userStory = UserStory.login('eighty4')
            apiResponsesForPageSetup(userStory)
            graphqlResponsesForRepoObjects(
                userStory,
                { owner: 'eighty4', name: 'l3' },
                {
                    '': 'tree',
                    'Cargo.toml': 'blob',
                },
            )
            await userStory.configureRoutes(page)

            await login(page)
            await page.goto('/watches')

            await page.getByRole('textbox').focus()
            await paste(page, repoObjUrl('eighty4', 'l3', 'blob', 'Cargo.toml'))

            await expect(page.getByRole('checkbox')).toBeVisible()
        })

        test('pasting tree url', async ({ page }) => {
            const userStory = UserStory.login('eighty4')
            apiResponsesForPageSetup(userStory)
            graphqlResponsesForRepoObjects(
                userStory,
                { owner: 'eighty4', name: 'l3' },
                {
                    l3_cli: 'tree',
                    'l3_cli/src': 'tree',
                    'l3_cli/CHANGELOG.md': 'blob',
                    'l3_cli/Cargo.toml': 'blob',
                },
            )
            await userStory.configureRoutes(page)

            await login(page)
            await page.goto('/watches')

            await page.getByRole('textbox').focus()
            await paste(page, repoObjUrl('eighty4', 'l3', 'tree', 'l3_cli'))

            await page.getByText('CHANGELOG.md').isVisible()
            await page.getByText('CHANGELOG.md').click()
            await expect(page.getByRole('checkbox')).toBeVisible()
        })
    })

    test.describe('autocomplete', () => {
        test('submit resolves complete filename', async ({ page }) => {
            const userStory = UserStory.login('eighty4')
            apiResponsesForPageSetup(userStory)
            graphqlResponsesForRepoObjects(
                userStory,
                { owner: 'eighty4', name: 'l3' },
                {
                    '': 'tree',
                    README: 'blob',
                    'README.md': 'blob',
                },
            )
            await userStory.configureRoutes(page)

            await login(page)
            await page.goto('/watches')

            const input = page.getByRole('textbox')
            await input.focus()
            await input.pressSequentially('eighty4/l3 ')
            await input.pressSequentially('README')
            await page.keyboard.press('Enter')

            await expect(page.getByRole('checkbox')).toBeVisible()
        })

        test('shows autocomplete suggestions', async ({ page }) => {
            const userStory = UserStory.login('eighty4')
            apiResponsesForPageSetup(userStory)
            graphqlResponsesForRepoObjects(
                userStory,
                { owner: 'eighty4', name: 'l3' },
                {
                    '': 'tree',
                    l3_base: 'tree',
                    'l3_base/src': 'tree',
                    'l3_base/Cargo.toml': 'blob',
                    'l3_base/CHANGELOG.md': 'blob',
                    l3_cli: 'tree',
                    'README.md': 'blob',
                    'l3_cli/src': 'tree',
                    'l3_cli/Cargo.toml': 'blob',
                    'l3_cli/CHANGELOG.md': 'blob',
                },
            )
            await userStory.configureRoutes(page)

            await login(page)
            await page.goto('/watches')

            const input = page.getByRole('textbox')
            await input.focus()
            await input.pressSequentially('eighty4/l3 ')
            await input.pressSequentially('l3')
            await expect(page.getByRole('menu')).toBeVisible()
        })

        test('keyboard nav autocomplete menu', async ({ page }) => {
            const userStory = UserStory.login('eighty4')
            apiResponsesForPageSetup(userStory)
            graphqlResponsesForRepoObjects(
                userStory,
                { owner: 'eighty4', name: 'l3' },
                {
                    '': 'tree',
                    l3_cli: 'tree',
                    'l3_cli/CHANGELOG.md': 'blob',
                },
            )
            await userStory.configureRoutes(page)

            await login(page)
            await page.goto('/watches')

            const input = page.getByRole('textbox')
            await input.focus()
            await input.pressSequentially('eighty4/l3 ')
            await input.pressSequentially('l3')
            await expect(page.getByRole('menu')).toBeVisible()

            // traverse with arrows
            await page.keyboard.press('ArrowDown')
            await page.keyboard.press('ArrowDown')
            await page.keyboard.press('Enter')

            // auto focuses exclusive match
            await input.pressSequentially('CHA')
            await page.keyboard.press('Enter')

            await expect(page.getByRole('textbox')).toBeVisible()
        })
    })
})

function apiResponsesForPageSetup(userStory: UserStory) {
    // for configure page
    userStory
        .withAppInstallation({ id: 1234567, repos: 'all' })
        // for verifying auth
        .withGraphqlResponse('ViewerLogin', null, {
            viewer: { login: 'eighty4' },
        })
        // for configure page
        .withGraphqlResponse('CheckSidelinesRepo', null, {
            viewer: {
                repository: {
                    nameWithOwner: 'eighty4/.sidelines',
                    homepageUrl: 'https://sidelines.dev',
                    isPrivate: true,
                },
            },
        })
        // for sync refs shared worker
        .withGraphqlResponse('CollectRepoHeadOids', null, {
            viewer: {
                repositories: {
                    nodes: [
                        {
                            name: 'l3',
                            owner: { login: 'eighty4' },
                            defaultBranchRef: {
                                target: {
                                    history: {
                                        edges: [
                                            {
                                                node: {
                                                    oid: '6773aaca',
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                    pageInfo: {
                        endCursor: 'asdf',
                        hasNextPage: false,
                    },
                },
            },
        })
}

function graphqlResponsesForRepoObjects(
    userStory: UserStory,
    { owner, name }: RepositoryId,
    repoObjects: Record<string, 'blob' | 'tree'>,
) {
    for (const [path, kind] of Object.entries(repoObjects)) {
        if (kind === 'blob') {
            userStory.withGraphqlResponse(
                'QueryRepoObjects',
                { owner, name, objExpr: 'HEAD:' + path },
                {
                    repository: {
                        object: {
                            __typename: 'Blob',
                            byteSize: 201,
                            isBinary: false,
                        },
                    },
                },
            )
        } else {
            userStory.withGraphqlResponse(
                'QueryRepoObjects',
                { owner, name, objExpr: 'HEAD:' + path },
                {
                    repository: {
                        object: {
                            __typename: 'Tree',
                            entries: Object.keys(repoObjects)
                                .filter(p => {
                                    if (p === path) return false
                                    const dirpath = dirname(p)
                                    if (dirpath === '.') {
                                        return path === ''
                                    } else {
                                        return dirpath === path
                                    }
                                })
                                .map(p => {
                                    if (repoObjects[p] === 'blob') {
                                        return {
                                            type: 'blob',
                                            name: basename(p),
                                            object: {
                                                blob: {
                                                    byteSize: 405,
                                                    isBinary: false,
                                                },
                                            },
                                        }
                                    } else {
                                        return {
                                            type: 'tree',
                                            name: basename(p),
                                        }
                                    }
                                }),
                        },
                    },
                },
            )
        }
    }
}

test.describe('FileBrowser', () => {})

test.describe('WatchToggle', () => {})

test.describe('FilePreview', () => {})
