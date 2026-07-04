import assert from 'node:assert/strict'
import { suite, test } from 'node:test'
import type { SidelinesObjectStoreName } from './idbSidelinesDev.ts'
import {
    forTestingGetObjectStoreNames,
    indicesForObjectStore,
    keyPathForIndex,
    keyPathForObjectStore,
} from './idbSidelinesDevStores.ts'

suite('resolves object store keys and indices', () => {
    test('key paths', () => {
        const keyPathsByStore: Record<
            SidelinesObjectStoreName,
            Array<string> | string
        > = {
            'commit-review': 'reviewId',
            'job-log': 'jobExecId',
            'job-result': ['jobExecId', 'whenDone'],
            'job-scheduling': 'jobId',
            'repo-context': 'nameWithOwner',
            'repo-heads': 'repo',
            'repo-nav': 'nameWithOwner',
            'repo-pkgs': ['nameWithOwner', 'defaultBranch', 'headOid'],
            'read-watches': ['nameWithOwner', 'path'],
        }
        for (const [store, keyPath] of Object.entries(keyPathsByStore)) {
            assert.deepEqual(
                keyPathForObjectStore(store),
                keyPath,
                'wrong key path for store ' + store,
            )
            const actualStores = forTestingGetObjectStoreNames()
            const expectedStores = Object.keys(keyPathsByStore)
            assert.equal(
                actualStores.length,
                expectedStores.length,
                `test is missing store(s): ${Array.from(new Set(actualStores).difference(new Set(expectedStores))).join(', ')}`,
            )
        }
    })

    test('indices', () => {
        for (const [store, expected] of Object.entries({
            'commit-review': null,
            'job-log': null,
            'job-result': null,
            'job-scheduling': null,
            'repo-context': null,
            'repo-heads': null,
            'repo-pkgs': null,
            'repo-nav': {
                'repo-nav-visited': 'when',
            },
            'read-watches': {
                'read-watches-by-repo': 'nameWithOwner',
            },
        } satisfies Record<
            SidelinesObjectStoreName,
            Record<string, Array<string> | string> | null
        >)) {
            const actualIndices = indicesForObjectStore(store)
            if (expected === null) {
                assert.ok(
                    actualIndices.length === 0,
                    'expected no indices for store ' + store,
                )
            } else {
                for (const [index, keyPath] of Object.entries(expected)) {
                    assert.deepEqual(
                        keyPathForIndex(store, index),
                        keyPath,
                        `wrong key path for store ${store} index ${index}`,
                    )
                    const expectedIndices: Array<string> = Object.keys(expected)
                    assert.equal(
                        actualIndices.length,
                        expectedIndices.length,
                        `test is missing indices for store ${store}: ${Array.from(new Set(actualIndices).difference(new Set(expectedIndices))).join(', ')}`,
                    )
                }
            }
        }
    })
})
