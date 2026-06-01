import { expect, test } from '@playwright/test'
import type {
    QMultipleReposLatestTagsGraph,
    QMultipleReposLatestTagsVars,
    QViewerRepoDirContentsGraph,
    QViewerRepoDirContentsVars,
    QViewerReposNamesGraph,
    QViewerReposNamesVars,
} from '@sidelines/github/GRAPHS'
import { indexedDBStateFrom } from './indexedDBState.ts'
import { login, userStoryWithSidelinesRepo } from './login.ts'
import { readRepoCommitAddition } from './opfsState.ts'
import screenshotOnFailure from './screenshotOnFailure.ts'
import { userStoryProjectPage } from './project.ts'

test.afterEach(screenshotOnFailure)

test(
    'on owned repos creates commit with upgraded github action',
    { tag: '@opfs' },
    async ({ baseURL, context, page }) => {
        await userStoryWithSidelinesRepo()
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
                'QViewerRepoDirContents',
                {
                    name: 'l3',
                    objExpr: 'HEAD:.github/workflows',
                } satisfies QViewerRepoDirContentsVars,
                {
                    viewer: {
                        repository: {
                            object: {
                                entries: [
                                    {
                                        name: 'ci_verify.yml',
                                        object: {
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
                } satisfies QViewerRepoDirContentsGraph,
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
                    indexedDBState.records['job-log'].length === 1 &&
                    indexedDBState.records['job-log'][0].whenDone instanceof
                        Date
                ) {
                    return indexedDBState
                }
            },
        )
        expect(indexedDBState.records['commit-review'].length).toBe(1)
        const commitReview = indexedDBState.records['commit-review'][0]
        expect(commitReview.additions.length).toBe(1)
        expect(commitReview.additions[0]).toStrictEqual({
            dirpath: '.github/workflows',
            filename: 'ci_verify.yml',
        })
        expect(
            await readRepoCommitAddition(
                page,
                commitReview.reviewId,
                { owner: 'eighty4', name: 'l3' },
                commitReview.additions[0],
            ),
        ).toBe(
            'on:\n  push:\njobs:\n  checkout-repo:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo "checked it out"\n',
        )
    },
)

test(
    'on single repo creates commit with upgraded github action',
    { tag: '@opfs' },
    async ({ baseURL, context, page }) => {
        await userStoryProjectPage()
            .withGraphqlResponse(
                'QViewerRepoDirContents',
                {
                    name: 'l3',
                    objExpr: 'HEAD:.github/workflows',
                } satisfies QViewerRepoDirContentsVars,
                {
                    viewer: {
                        repository: {
                            object: {
                                entries: [
                                    {
                                        name: 'ci_verify.yml',
                                        object: {
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
                } satisfies QViewerRepoDirContentsGraph,
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
        await page.goto('eighty4/l3')
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
                    indexedDBState.records['job-log'].length === 1 &&
                    indexedDBState.records['job-log'][0].whenDone instanceof
                        Date
                ) {
                    return indexedDBState
                }
            },
        )
        expect(indexedDBState.records['commit-review'].length).toBe(1)
        const commitReview = indexedDBState.records['commit-review'][0]
        expect(commitReview.additions.length).toBe(1)
        expect(commitReview.additions[0]).toStrictEqual({
            dirpath: '.github/workflows',
            filename: 'ci_verify.yml',
        })
        expect(
            await readRepoCommitAddition(
                page,
                commitReview.reviewId,
                { owner: 'eighty4', name: 'l3' },
                commitReview.additions[0],
            ),
        ).toBe(
            'on:\n  push:\njobs:\n  checkout-repo:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo "checked it out"\n',
        )
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
