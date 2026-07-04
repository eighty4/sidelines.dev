import { expect, test, type BrowserContext } from '@playwright/test'
import type { CommitReviewRecord } from '@sidelines/data/RECORDS'
import type {
    QMultipleReposLatestTagsGraph,
    QMultipleReposLatestTagsVars,
    QViewerAndExplicitRepoHeadOidsGraph,
    QViewerRepoDefaultBranchDirContentsGraph,
    QViewerRepoDefaultBranchDirContentsVars,
    QViewerReposNamesGraph,
    QViewerReposNamesVars,
} from '@sidelines/github/GRAPHS'
import {
    sidelinesObjectStoreRecords,
    type SidelinesObjectStoreRecords,
} from './idbSidelinesDev.ts'
import { login, userStoryWithSidelinesRepo } from './login.ts'
import { readRepoCommitAddition } from './opfsState.ts'
import { userStoryProjectPage } from './project.ts'
import retryUntilCondition from './retryUntilCondition.ts'
import screenshotOnFailure from './screenshotOnFailure.ts'

test.afterEach(screenshotOnFailure)

test(
    'on owned repos creates commit with upgraded github action',
    { tag: '@opfs' },
    async ({ baseURL, context, page }) => {
        const committedDate = new Date()
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
            .withGraphqlResponse(
                'QViewerReposNames',
                { cursor: null, pageSize: 100 } satisfies QViewerReposNamesVars,
                {
                    viewer: {
                        login: 'eighty4',
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
                'QViewerRepoDefaultBranchDirContents',
                {
                    name: 'l3',
                    objExpr: 'HEAD:.github/workflows',
                } satisfies QViewerRepoDefaultBranchDirContentsVars,
                {
                    viewer: {
                        repository: {
                            defaultBranchRef: {
                                name: 'master',
                                target: {
                                    history: {
                                        edges: [
                                            {
                                                node: {
                                                    oid: 'abcabc12',
                                                    committedDate:
                                                        committedDate.toISOString(),
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
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
                } satisfies QViewerRepoDefaultBranchDirContentsGraph,
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
        const records = await waitForRepoJobComplete(baseURL!, context)
        expect(records['commit-review'].length).toBe(1)
        const commitReview = records['commit-review'][0]
        expect(records['commit-review'][0]).toStrictEqual({
            reviewId: commitReview.reviewId,
            nameWithOwner: 'eighty4/l3',
            branch: {
                name: 'master',
                headOid: 'abcabc12',
            },
            commitMessage: 'Upgrading GitHub actions',
            additions: [
                {
                    dirpath: '.github/workflows',
                    filename: 'ci_verify.yml',
                },
            ],
            deletions: null,
        } satisfies CommitReviewRecord)
        expect(
            await readRepoCommitAddition(
                page,
                commitReview.reviewId,
                { owner: 'eighty4', name: 'l3' },
                commitReview.additions![0],
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
        const committedDate = new Date()
        await userStoryProjectPage()
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
            .withGraphqlResponse(
                'QViewerRepoDefaultBranchDirContents',
                {
                    name: 'l3',
                    objExpr: 'HEAD:.github/workflows',
                } satisfies QViewerRepoDefaultBranchDirContentsVars,
                {
                    viewer: {
                        repository: {
                            defaultBranchRef: {
                                name: 'master',
                                target: {
                                    history: {
                                        edges: [
                                            {
                                                node: {
                                                    oid: 'abcabc12',
                                                    committedDate:
                                                        committedDate.toISOString(),
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
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
                } satisfies QViewerRepoDefaultBranchDirContentsGraph,
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
        const records = await waitForRepoJobComplete(baseURL!, context)
        expect(records['commit-review'].length).toBe(1)
        const commitReview = records['commit-review'][0]
        expect(records['commit-review'][0]).toStrictEqual({
            reviewId: commitReview.reviewId,
            nameWithOwner: 'eighty4/l3',
            branch: {
                name: 'master',
                headOid: 'abcabc12',
            },
            commitMessage: 'Upgrading GitHub actions',
            additions: [
                {
                    dirpath: '.github/workflows',
                    filename: 'ci_verify.yml',
                },
            ],
            deletions: null,
        } satisfies CommitReviewRecord)
        expect(
            await readRepoCommitAddition(
                page,
                commitReview.reviewId,
                { owner: 'eighty4', name: 'l3' },
                commitReview.additions![0],
            ),
        ).toBe(
            'on:\n  push:\njobs:\n  checkout-repo:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo "checked it out"\n',
        )
    },
)

async function waitForRepoJobComplete(
    baseURL: string,
    context: BrowserContext,
): Promise<SidelinesObjectStoreRecords> {
    return await retryUntilCondition(1000, 1000, 10000, async () => {
        const records = await sidelinesObjectStoreRecords(baseURL!, context)
        const repoJobs = records['job-log'].filter(
            jobLogRecord =>
                jobLogRecord.jobKind === 'repos' &&
                jobLogRecord.jobId === 'JOB_repos_UPGRADE_ACTIONS' &&
                jobLogRecord.whenDone instanceof Date,
        )
        if (repoJobs.length === 1) {
            return records
        }
    })
}
