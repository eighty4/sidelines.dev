import { expect, test } from '@playwright/test'
import type {
    QMultipleReposLatestTagsGraph,
    QMultipleReposLatestTagsVars,
    QViewerRepoDirContentGraph,
    QViewerRepoDirContentVars,
    QViewerReposNamesGraph,
    QViewerReposNamesVars,
} from '@sidelines/github/GRAPHS'
import { indexedDBStateFrom } from './indexedDBState.ts'
import { login } from './login.ts'
import screenshotOnFailure from './screenshotOnFailure.ts'
import { UserStory } from './github/UserStory.ts'

test.afterEach(screenshotOnFailure)

test(
    'creates commit with upgraded github action',
    { tag: '@opfs' },
    async ({ baseURL, context, page }) => {
        await loginToGameplanUserStory()
            .withGraphqlResponse(
                'QViewerReposNames',
                { cursor: null, pageSize: 100 } satisfies QViewerReposNamesVars,
                {
                    viewer: {
                        repositories: {
                            nodes: [
                                {
                                    name: 'l3',
                                    owner: {
                                        login: 'eighty4',
                                    },
                                },
                            ],
                            pageInfo: {
                                endCursor: null,
                                hasNextPage: false,
                            },
                        },
                    },
                } satisfies QViewerReposNamesGraph,
            )
            .withGraphqlResponse(
                'QViewerRepoDirContent',
                {
                    name: 'l3',
                    objExpr: 'HEAD:.github/workflows',
                } satisfies QViewerRepoDirContentVars,
                {
                    viewer: {
                        repository: {
                            object: {
                                entries: [
                                    {
                                        name: 'ci_verify.yml',
                                        object: {
                                            byteSize: 1234,
                                            text: `\
on:
  push:
jobs:
  checkout-repo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: echo "checked it out"
`,
                                        },
                                        type: 'blob',
                                    },
                                ],
                            },
                        },
                    },
                } satisfies QViewerRepoDirContentGraph,
            )
            .withGraphqlResponse(
                'QMultipleReposLatestTags',
                { tags: 10 } satisfies QMultipleReposLatestTagsVars,
                {
                    repo0: {
                        refs: {
                            edges: [
                                {
                                    node: {
                                        name: 'v4',
                                    },
                                },
                            ],
                        },
                    },
                } satisfies QMultipleReposLatestTagsGraph,
            )
            .configureRoutes(page)
        await login(page)
        const execButton = page.getByRole('button', { name: 'Exec' })
        await expect(execButton).toBeVisible()
        await execButton.click()
        await expect(execButton).toBeDisabled()
        const indexedDBState = await retryUntilCondition(
            1000,
            1000,
            20000,
            async () => {
                const indexedDBState = await indexedDBStateFrom(
                    baseURL!,
                    context,
                )
                if (
                    indexedDBState.records['repo-jobs'].length === 1 &&
                    indexedDBState.records['repo-jobs'][0].whenDone instanceof
                        Date
                ) {
                    return indexedDBState
                }
            },
        )
        expect(indexedDBState.records['commit-review'].length).toBe(1)
        const commitReview = indexedDBState.records['commit-review'][0]
        expect(commitReview.commit.additions.length).toBe(1)
        expect(commitReview.commit.additions[0]).toStrictEqual({
            dirpath: '.github/workflows',
            filename: 'ci_verify.yml',
            content:
                'on:\n  push:\njobs:\n  checkout-repo:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo "checked it out"\n',
        })
    },
)

async function retryUntilCondition<T>(
    delay: number,
    interval: number,
    timeout: number,
    fn: () => Promise<T | undefined>,
): Promise<T> {
    await new Promise(res => setTimeout(res, delay))
    timeout -= delay
    let result: T | undefined
    while (typeof (result = await fn()) === 'undefined') {
        await new Promise(res => setTimeout(res, interval))
        timeout -= interval
        if (timeout <= 0) {
            throw Error('timed out retrying operation')
        }
    }
    return result
}

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
