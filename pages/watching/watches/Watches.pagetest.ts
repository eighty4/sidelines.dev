import { expect, type Page, test } from '@playwright/test'
import { UserStory } from '$testing/github/UserStory.ts'
import { login } from '$testing/sidelines/login.ts'

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
            await UserStory.login('eighty4')
                // for configure page
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
                .withGraphqlResponse(
                    'QueryRepoObjects',
                    {
                        owner: 'eighty4',
                        name: 'l3',
                        objExpr: 'HEAD:Cargo.toml',
                    },
                    {
                        repository: {
                            object: {
                                __typename: 'Blob',
                                byteSize: 404,
                                isBinary: false,
                            },
                        },
                    },
                )
                .configureRoutes(page)

            await login(page)
            await page.goto('/watches')

            await page.getByRole('textbox').focus()
            await paste(page, repoObjUrl('eighty4', 'l3', 'blob', 'Cargo.toml'))

            await expect(page.getByRole('checkbox')).toBeVisible()
        })

        test('pasting tree url', async ({ page }) => {
            await UserStory.login('eighty4')
                // for configure page
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
                .withGraphqlResponse(
                    'QueryRepoObjects',
                    {
                        owner: 'eighty4',
                        name: 'l3',
                        objExpr: 'HEAD:l3_cli',
                    },
                    {
                        repository: {
                            object: {
                                __typename: 'Tree',
                                entries: [
                                    {
                                        name: 'src',
                                        type: 'tree',
                                    },
                                    {
                                        name: 'Cargo.toml',
                                        type: 'blob',
                                        object: {
                                            byteSize: 405,
                                            isBinary: false,
                                        },
                                    },
                                    {
                                        name: 'CHANGELOG.md',
                                        type: 'blob',
                                        object: {
                                            byteSize: 404,
                                            isBinary: false,
                                        },
                                    },
                                ],
                            },
                        },
                    },
                )
                .configureRoutes(page)

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
            await UserStory.login('eighty4')
                // for configure page
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
                .withGraphqlResponse(
                    'QueryRepoObjects',
                    {
                        owner: 'eighty4',
                        name: 'l3',
                        objExpr: 'HEAD:',
                    },
                    {
                        repository: {
                            object: {
                                __typename: 'Tree',
                                entries: [
                                    {
                                        name: 'README.md',
                                        type: 'blob',
                                        object: {
                                            byteSize: 201,
                                            isBinary: false,
                                        },
                                    },
                                    {
                                        name: 'README',
                                        type: 'blob',
                                        object: {
                                            byteSize: 201,
                                            isBinary: false,
                                        },
                                    },
                                ],
                            },
                        },
                    },
                )
                .configureRoutes(page)

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
            await UserStory.login('eighty4')
                // for configure page
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
                .withGraphqlResponse(
                    'QueryRepoObjects',
                    {
                        owner: 'eighty4',
                        name: 'l3',
                        objExpr: 'HEAD:',
                    },
                    {
                        repository: {
                            object: {
                                __typename: 'Tree',
                                entries: [
                                    {
                                        name: 'l3_base',
                                        type: 'tree',
                                    },
                                    {
                                        name: 'l3_cli',
                                        type: 'tree',
                                    },
                                    {
                                        name: 'README.md',
                                        type: 'blob',
                                        object: {
                                            byteSize: 201,
                                            isBinary: false,
                                        },
                                    },
                                ],
                            },
                        },
                    },
                )
                .withGraphqlResponse(
                    'QueryRepoObjects',
                    {
                        owner: 'eighty4',
                        name: 'l3',
                        objExpr: 'HEAD:l3_base',
                    },
                    {
                        repository: {
                            object: {
                                __typename: 'Tree',
                                entries: [
                                    {
                                        name: 'src',
                                        type: 'tree',
                                    },
                                    {
                                        name: 'Cargo.toml',
                                        type: 'blob',
                                        object: {
                                            byteSize: 405,
                                            isBinary: false,
                                        },
                                    },
                                    {
                                        name: 'CHANGELOG.md',
                                        type: 'blob',
                                        object: {
                                            byteSize: 404,
                                            isBinary: false,
                                        },
                                    },
                                ],
                            },
                        },
                    },
                )
                .withGraphqlResponse(
                    'QueryRepoObjects',
                    {
                        owner: 'eighty4',
                        name: 'l3',
                        objExpr: 'HEAD:l3_cli',
                    },
                    {
                        repository: {
                            object: {
                                __typename: 'Tree',
                                entries: [
                                    {
                                        name: 'src',
                                        type: 'tree',
                                    },
                                    {
                                        name: 'Cargo.toml',
                                        type: 'blob',
                                        object: {
                                            byteSize: 405,
                                            isBinary: false,
                                        },
                                    },
                                    {
                                        name: 'CHANGELOG.md',
                                        type: 'blob',
                                        object: {
                                            byteSize: 404,
                                            isBinary: false,
                                        },
                                    },
                                ],
                            },
                        },
                    },
                )
                .configureRoutes(page)

            await login(page)
            await page.goto('/watches')

            const input = page.getByRole('textbox')
            await input.focus()
            await input.pressSequentially('eighty4/l3 ')
            await input.pressSequentially('l3')
            await expect(page.getByRole('menu')).toBeVisible()
        })

        test('keyboard nav autocomplete menu', async ({ page }) => {
            await UserStory.login('eighty4')
                // for configure page
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
                .withGraphqlResponse(
                    'QueryRepoObjects',
                    {
                        owner: 'eighty4',
                        name: 'l3',
                        objExpr: 'HEAD:',
                    },
                    {
                        repository: {
                            object: {
                                __typename: 'Tree',
                                entries: [
                                    {
                                        name: 'l3_base',
                                        type: 'tree',
                                    },
                                    {
                                        name: 'l3_cli',
                                        type: 'tree',
                                    },
                                    {
                                        name: 'README.md',
                                        type: 'blob',
                                        object: {
                                            byteSize: 201,
                                            isBinary: false,
                                        },
                                    },
                                ],
                            },
                        },
                    },
                )
                .withGraphqlResponse(
                    'QueryRepoObjects',
                    {
                        owner: 'eighty4',
                        name: 'l3',
                        objExpr: 'HEAD:l3_base',
                    },
                    {
                        repository: {
                            object: {
                                __typename: 'Tree',
                                entries: [
                                    {
                                        name: 'src',
                                        type: 'tree',
                                    },
                                    {
                                        name: 'Cargo.toml',
                                        type: 'blob',
                                        object: {
                                            byteSize: 405,
                                            isBinary: false,
                                        },
                                    },
                                    {
                                        name: 'CHANGELOG.md',
                                        type: 'blob',
                                        object: {
                                            byteSize: 404,
                                            isBinary: false,
                                        },
                                    },
                                ],
                            },
                        },
                    },
                )
                .withGraphqlResponse(
                    'QueryRepoObjects',
                    {
                        owner: 'eighty4',
                        name: 'l3',
                        objExpr: 'HEAD:l3_cli',
                    },
                    {
                        repository: {
                            object: {
                                __typename: 'Tree',
                                entries: [
                                    {
                                        name: 'src',
                                        type: 'tree',
                                    },
                                    {
                                        name: 'Cargo.toml',
                                        type: 'blob',
                                        object: {
                                            byteSize: 405,
                                            isBinary: false,
                                        },
                                    },
                                    {
                                        name: 'CHANGELOG.md',
                                        type: 'blob',
                                        object: {
                                            byteSize: 404,
                                            isBinary: false,
                                        },
                                    },
                                ],
                            },
                        },
                    },
                )
                .withGraphqlResponse(
                    'QueryRepoObjects',
                    {
                        owner: 'eighty4',
                        name: 'l3',
                        objExpr: 'HEAD:l3_cli/src',
                    },
                    {
                        repository: {
                            object: {
                                __typename: 'Tree',
                                entries: [
                                    {
                                        name: 'lib.rs',
                                        type: 'blob',
                                        object: {
                                            byteSize: 201,
                                            isBinary: false,
                                        },
                                    },
                                ],
                            },
                        },
                    },
                )
                .configureRoutes(page)

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

test.describe('FileBrowser', () => {})

test.describe('WatchToggle', () => {})

test.describe('FilePreview', () => {})
