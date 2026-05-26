import { expect, test } from '@playwright/test'
import type {
    QRepoDefaultBranchGraph,
    QRepoDefaultBranchVars,
    QRepoMultipleObjectContentsGraph,
    QRepoMultipleObjectContentsVars,
    QViewerRepoUserContextGraph,
} from '@sidelines/github/GRAPHS'
import { login, userStoryWithSidelinesRepo } from './login.ts'
import screenshotOnFailure from './screenshotOnFailure.ts'
import { indexedDBStateFrom } from './indexedDBState.ts'
import type { QViewerRepoUserContextVars } from '../libs/github/lib/repository/gql.ts'

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
        await userStoryWithSidelinesRepo()
            .withGraphqlResponse(
                'QViewerRepoUserContext',
                {
                    owner: 'eighty4',
                    name: 'l3',
                } satisfies QViewerRepoUserContextVars,
                {
                    viewer: {
                        login: 'eighty4',
                    },
                    repository: {
                        viewerPermission: 'ADMIN',
                    },
                } satisfies QViewerRepoUserContextGraph,
            )
            .withGraphqlResponse(
                'QRepoDefaultBranch',
                {
                    owner: 'eighty4',
                    name: 'l3',
                } satisfies QRepoDefaultBranchVars,
                {
                    repository: {
                        defaultBranchRef: {
                            name: 'main',
                            target: {
                                history: {
                                    edges: [
                                        {
                                            node: {
                                                committedDate:
                                                    committedDate.toISOString(),
                                                oid: 'abcabc12',
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                } satisfies QRepoDefaultBranchGraph,
            )
            .withGraphqlResponse(
                'QRepoMultipleObjectContents',
                {
                    owner: 'eighty4',
                    name: 'l3',
                } satisfies QRepoMultipleObjectContentsVars,
                createQRepoMultipleObjectContentsGraph({
                    'Cargo.toml': `[package]\nname = "l3_cli"\nversion = "0.0.1"`,
                }) satisfies QRepoMultipleObjectContentsGraph,
            )
            .configureRoutes(page)
        await login(page)
        await page.goto('/eighty4/l3')
        await expect(page.getByRole('button', { name: 'Exec' })).toBeVisible()
        await expect(page.getByText('l3_cli')).toBeVisible()

        const indexedDBState = await indexedDBStateFrom(baseURL!, context)
        expect(indexedDBState.records['repo-pkgs']).toStrictEqual([
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
        await userStoryWithSidelinesRepo()
            .withGraphqlResponse(
                'QViewerRepoUserContext',
                {
                    owner: 'eighty4',
                    name: 'l3',
                } satisfies QViewerRepoUserContextVars,
                {
                    viewer: {
                        login: 'eighty4',
                    },
                    repository: {
                        viewerPermission: 'ADMIN',
                    },
                } satisfies QViewerRepoUserContextGraph,
            )
            .withGraphqlResponse(
                'QRepoDefaultBranch',
                {
                    owner: 'eighty4',
                    name: 'l3',
                } satisfies QRepoDefaultBranchVars,
                {
                    repository: {
                        defaultBranchRef: {
                            name: 'main',
                            target: {
                                history: {
                                    edges: [
                                        {
                                            node: {
                                                committedDate:
                                                    committedDate.toISOString(),
                                                oid: 'abcabc12',
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                } satisfies QRepoDefaultBranchGraph,
            )
            .withGraphqlResponse(
                'QRepoMultipleObjectContents',
                {
                    owner: 'eighty4',
                    name: 'l3',
                } satisfies QRepoMultipleObjectContentsVars,
                createQRepoMultipleObjectContentsGraph({
                    'Cargo.toml': `[package]\nname = "l3_cli"\nversion = "0.0.1"`,
                }) satisfies QRepoMultipleObjectContentsGraph,
            )
            .configureRoutes(page)
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

const PACKAGE_HINTS = [
    'pubspec.yaml',
    'go.mod',
    'package.json',
    'Cargo.toml',
    'build.zig',
    'build.zig.zon',
    'pnpm-workspace.yaml',
] as const

type PackageHint = (typeof PACKAGE_HINTS)[number]

function createQRepoMultipleObjectContentsGraph(
    contents: Partial<Record<PackageHint, string>>,
): QRepoMultipleObjectContentsGraph {
    return {
        repository: Object.fromEntries(
            PACKAGE_HINTS.map((filename, i) => [
                `obj${i}`,
                contents[filename] ? { text: contents[filename] } : null,
            ]),
        ),
    }
}
