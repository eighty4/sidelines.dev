import { expect, test, type BrowserContext } from '@playwright/test'
import type { RepoPackagesRecord } from '@sidelines/data/RECORDS'
import type {
    QRepoMultipleObjectContentsVars,
    QViewerAndExplicitRepoHeadOidsGraph,
} from '@sidelines/github/GRAPHS'
import type { SyncedRefsJobId } from '@sidelines/model/jobs/id'
import { makeRepoPackagesQRepoMultipleObjectContentsGraph } from './github/graphs/packages.ts'
import {
    sidelinesObjectStoreRecords,
    type SidelinesObjectStoreRecords,
} from './indexedDBSidelinesDev.ts'
import { login, userStoryWithSidelinesRepo } from './login.ts'
import retryUntilCondition from './retryUntilCondition.ts'
import screenshotOnFailure from './screenshotOnFailure.ts'

test.afterEach(screenshotOnFailure)

test(
    'runs synced refs job on newly synced repo',
    { tag: '@opfs' },
    async ({ baseURL, context, page }) => {
        const committedWhen = new Date()
        await userStoryWithSidelinesRepo()
            .withGraphqlResponse('QViewerAndExplicitRepoHeadOids', null, {
                viewer: {
                    repositories: {
                        nodes: [
                            {
                                nameWithOwner: 'eighty4/l3',
                                defaultBranchRef: {
                                    name: 'main',
                                    target: {
                                        history: {
                                            edges: [
                                                {
                                                    node: {
                                                        committedDate:
                                                            committedWhen.toISOString(),
                                                        oid: 'abcdef12',
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                },
                            },
                        ],
                        pageInfo: {
                            endCursor: null,
                            hasNextPage: false,
                        },
                    },
                },
            } satisfies QViewerAndExplicitRepoHeadOidsGraph)
            .withGraphqlResponse(
                'QRepoMultipleObjectContents',
                {
                    owner: 'eighty4',
                    name: 'l3',
                } satisfies QRepoMultipleObjectContentsVars,
                makeRepoPackagesQRepoMultipleObjectContentsGraph({
                    'Cargo.toml': `[package]\nname = "l3_cli"\nversion = "0.0.1"`,
                }),
            )
            .configureRoutes(page)
        await login(page)

        const records = await waitForSyncedRefsJobComplete(
            baseURL!,
            context,
            'JOB_syncedRefs_PACKAGES',
        )
        expect(records['repo-pkgs'].length).toBe(1)
        const repoPackagesRecord = records['repo-pkgs'][0]
        expect(repoPackagesRecord).toStrictEqual({
            nameWithOwner: 'eighty4/l3',
            committedWhen,
            defaultBranch: 'main',
            headOid: 'abcdef12',
            packages: [
                {
                    configFile: 'Cargo.toml',
                    language: 'rust',
                    name: 'l3_cli',
                    version: '0.0.1',
                    path: '',
                    private: false,
                },
            ],
        } satisfies RepoPackagesRecord)
    },
)

async function waitForSyncedRefsJobComplete(
    baseURL: string,
    context: BrowserContext,
    jobId: SyncedRefsJobId,
): Promise<SidelinesObjectStoreRecords> {
    return await retryUntilCondition(1000, 1000, 10000, async () => {
        const records = await sidelinesObjectStoreRecords(baseURL!, context)
        const jobMatches = records['job-log'].filter(
            jobLogRecord =>
                jobLogRecord.jobKind === 'syncedRefs' &&
                jobLogRecord.jobId === jobId &&
                jobLogRecord.whenDone instanceof Date,
        )
        if (jobMatches.length === 1) {
            return records
        }
    })
}
