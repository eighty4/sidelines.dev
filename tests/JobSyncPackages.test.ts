import { expect, test, type BrowserContext } from '@playwright/test'
import type {
    JobResultRecord,
    RepoHeadRecord,
    RepoPackagesRecord,
} from '@sidelines/data/RECORDS'
import type {
    QRepoMultipleObjectContentsVars,
    QViewerAndExplicitRepoHeadOidsGraph,
} from '@sidelines/github/GRAPHS'
import type { SyncedRefsJobId } from '@sidelines/model/jobs/id'
import { ulid } from 'ulid'
import { makeRepoPackagesQRepoMultipleObjectContentsGraph } from './github/graphs/packages.ts'
import {
    createSidelinesDatabase,
    sidelinesObjectStoreRecords,
    type SidelinesObjectStoreRecords,
} from './idbSidelinesDev.ts'
import { login, userStoryWithSidelinesRepo } from './login.ts'
import retryUntilCondition from './retryUntilCondition.ts'
import screenshotOnFailure from './screenshotOnFailure.ts'

test.afterEach(screenshotOnFailure)

test(
    'runs synced refs job on newly synced repo',
    { tag: '@opfs' },
    async ({ baseURL, context, page }) => {
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
        expect(records['job-result'].length).toBe(1)
        const resultRecord: JobResultRecord<'syncedRefs'> =
            records['job-result'][0]
        expect(resultRecord).toStrictEqual({
            jobExecId: resultRecord.jobExecId,
            jobKind: 'syncedRefs',
            repo: 'eighty4/l3',
            whenDone: resultRecord.whenDone,
            syncedRefs: {
                from: null,
                to: {
                    headOid: 'abcdef12',
                    name: 'main',
                },
            },
            result: {
                state: 'done',
                when: resultRecord.result.when,
            },
        } satisfies JobResultRecord<'syncedRefs'>)
        expect(records['repo-pkgs'].length).toBe(1)
        const packagesRecord = records['repo-pkgs'][0]
        expect(packagesRecord).toStrictEqual({
            nameWithOwner: 'eighty4/l3',
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

// test will fail if launching SyncPackages worker tries to run `eighty4/breezy`
// even though it has a `job-result` record bc there is no route fulfillment for QRepoMultipleObjectContents
test(
    'restarts unfinished job on page load',
    { tag: '@opfs' },
    async ({ baseURL, context, page }) => {
        const fourMinsAgo = new Date()
        fourMinsAgo.setTime(fourMinsAgo.getTime() - 4 * 60 * 1000)
        await createSidelinesDatabase(baseURL!, context, {
            'job-log': [
                {
                    jobExecId: 'executor',
                    jobId: 'JOB_syncedRefs_PACKAGES',
                    jobKind: 'syncedRefs',
                    whenInit: fourMinsAgo,
                    whenLastActivity: null,
                    whenDone: null,
                    spec: {
                        repos: {
                            'eighty4/breezy': {
                                from: null,
                                to: {
                                    name: 'main',
                                    headOid: 'abcdef12',
                                },
                            },
                            'eighty4/c2': {
                                from: null,
                                to: {
                                    name: 'main',
                                    headOid: 'abcdef12',
                                },
                            },
                            'eighty4/l3': {
                                from: null,
                                to: {
                                    name: 'main',
                                    headOid: 'abcdef12',
                                },
                            },
                        },
                    },
                },
            ],
            'job-result': [
                {
                    jobExecId: 'executor',
                    jobKind: 'syncedRefs',
                    repo: 'eighty4/breezy',
                    whenDone: ulid(new Date().getTime()),
                    syncedRefs: {
                        from: null,
                        to: {
                            name: 'main',
                            headOid: 'abcdef12',
                        },
                    },
                    result: {
                        state: 'done',
                        when: new Date(),
                    },
                } satisfies JobResultRecord<'syncedRefs'>,
            ],
            'repo-heads': ['breezy', 'c2', 'l3'].map(repo => {
                return {
                    repo: `eighty4/${repo}`,
                    defaultBranch: {
                        name: 'main',
                        headOid: 'abcdef12',
                    },
                } satisfies RepoHeadRecord
            }),
        })

        await userStoryWithSidelinesRepo()
            .withGraphqlResponse('QViewerAndExplicitRepoHeadOids', null, {
                viewer: {
                    repositories: {
                        nodes: ['breezy', 'c2', 'l3'].map(repo => ({
                            nameWithOwner: `eighty4/${repo}`,
                            defaultBranchRef: {
                                name: 'main',
                                target: {
                                    history: {
                                        edges: [
                                            {
                                                node: {
                                                    oid: 'abcdef12',
                                                },
                                            },
                                        ],
                                    },
                                },
                            },
                        })),
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
                    name: 'c2',
                } satisfies QRepoMultipleObjectContentsVars,
                makeRepoPackagesQRepoMultipleObjectContentsGraph({
                    'Cargo.toml': `[package]\nname = "c2_cli"\nversion = "0.0.1"`,
                }),
            )
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
        // assert for the 2 new `repo-pkgs` records bc we did not create `eighty4/breezy` beforehand
        expect(records['repo-pkgs'].length).toBe(2)
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
