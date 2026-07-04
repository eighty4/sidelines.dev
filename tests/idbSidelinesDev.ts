import type { BrowserContext } from '@playwright/test'
import type {
    CommitReviewRecord,
    JobLogRecord,
    JobResultRecord,
    JobSchedulingRecord,
    ReadingWatchRecord,
    RepoContextRecord,
    RepoHeadRecord,
    RepoNavRecord,
    RepoPackagesRecord,
} from '@sidelines/data/RECORDS'
import {
    setIndexedDBStorageState,
    type CreateIDBObjectStore,
} from './idbCreate.ts'
import {
    indicesForObjectStore,
    keyPathForIndex,
    keyPathForObjectStore,
} from './idbSidelinesDevStores.ts'
import { indexedDBStateFrom } from './idbState.ts'

const SidelinesObjectStoreNames = [
    'commit-review',
    'job-log',
    'job-result',
    'job-scheduling',
    'repo-context',
    'repo-heads',
    'repo-nav',
    'repo-pkgs',
    'read-watches',
] as const

export type SidelinesObjectStoreName =
    (typeof SidelinesObjectStoreNames)[number]

export type SidelinesObjectStoreRecords = {
    'commit-review': Array<CommitReviewRecord>
    'job-log': Array<JobLogRecord>
    'job-result': Array<JobResultRecord<any>>
    'job-scheduling': Array<JobSchedulingRecord>
    'read-watches': Array<ReadingWatchRecord>
    'repo-context': Array<RepoContextRecord>
    'repo-heads': Array<RepoHeadRecord>
    'repo-nav': Array<RepoNavRecord>
    'repo-pkgs': Array<RepoPackagesRecord>
}

function isSidelinesObjectStoreName(
    name: string,
): name is SidelinesObjectStoreName {
    return SidelinesObjectStoreNames.includes(name as any)
}

export async function sidelinesObjectStoreRecords(
    baseURL: string,
    context: BrowserContext,
    print?: boolean,
): Promise<SidelinesObjectStoreRecords> {
    const { records } = await indexedDBStateFrom(baseURL, context, print)
    const objectStores = Object.keys(records)
    for (const objectStore of objectStores) {
        if (!isSidelinesObjectStoreName(objectStore)) {
            throw Error(`\
    ObjectStore \`${objectStore}\` was unexpected when collecting data from IndexedDB during Playwright tests.\
    Verify \`SidelinesColumnFamilies\` in tests/indexedDBState.ts was updated with any object store additions in \`@sidelines/data\`.`)
        }
    }
    if (objectStores.length !== SidelinesObjectStoreNames.length) {
        const extras = Array.from(
            new Set(objectStores).symmetricDifference(
                new Set(SidelinesObjectStoreNames),
            ),
        )
        throw Error(`\
ObjectStores were removed from \`@sidelines/data\` without removing from \`SidelinesColumnFamilies\` in tests/indexedDBState.ts.\
The offending ObjectStore names are: [${extras.map(name => `"${name}"`).join(', ')}].`)
    }
    return records as SidelinesObjectStoreRecords
}

export async function createSidelinesDatabase(
    baseURL: string,
    context: BrowserContext,
    records: Partial<SidelinesObjectStoreRecords>,
) {
    await setIndexedDBStorageState(baseURL, context, {
        name: 'sidelines-dev',
        version: 1,
        stores: Object.fromEntries(
            SidelinesObjectStoreNames.map(store => [
                store,
                {
                    keyPath: keyPathForObjectStore(store),
                    indices: indicesForObjectStore(store).map(index => ({
                        name: index,
                        keyPath: keyPathForIndex(store, index)[0],
                    })),
                } satisfies CreateIDBObjectStore,
            ]),
        ),
        records,
    })
}
