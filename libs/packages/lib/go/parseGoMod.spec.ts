import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { BranchRef, RepositoryId } from '@sidelines/model'
import { extractName, parseGoMod } from './parseGoMod.ts'
import { TestDataProvider } from '../_testFindPackages.ts'
import { FindPackagesApi } from '../findPackagesApi.ts'

const MOD = 'github.com/eighty4/sse'

test('extract module name from go.mod', () => {
    assert.deepEqual(extractName(`module ${MOD}`), MOD)
    assert.deepEqual(extractName(`\nmodule ${MOD}\n`), MOD)
    assert.deepEqual(extractName(`go 1.22\nmodule ${MOD}\n`), MOD)
})

const repo: RepositoryId = { owner: 'eighty4', name: 'maestro' }

const branchRef: BranchRef = {
    headOid: 'abcdefgXXX',
    name: '',
    committedDate: new Date(),
}

test('go package name from go.mod', async () => {
    const goMod = `module ${MOD}`
    assert.deepEqual(
        await parseGoMod(
            new FindPackagesApi(new TestDataProvider({}, {}), repo, branchRef),
            '',
            goMod,
        ),
        {
            name: 'github.com/eighty4/sse',
            language: 'go',
            configFile: 'go.mod',
            path: '',
            version: 'abcdefg',
        },
    )
})

test('go package name from repo name', async () => {
    const goMod = `no errors`
    assert.deepEqual(
        await parseGoMod(
            new FindPackagesApi(new TestDataProvider({}, {}), repo, branchRef),
            '',
            goMod,
        ),
        {
            name: 'github.com/eighty4/maestro',
            language: 'go',
            configFile: 'go.mod',
            path: '',
            version: 'abcdefg',
        },
    )
})

test('go package version from sha', async () => {
    const goMod = `module ${MOD}`
    assert.deepEqual(
        await parseGoMod(
            new FindPackagesApi(new TestDataProvider({}, {}), repo, branchRef),
            '',
            goMod,
        ),
        {
            name: 'github.com/eighty4/sse',
            language: 'go',
            configFile: 'go.mod',
            path: '',
            version: 'abcdefg',
        },
    )
})

test('go package version from tag', async () => {
    const goMod = `module ${MOD}`
    assert.deepEqual(
        await parseGoMod(
            new FindPackagesApi(
                new TestDataProvider({}, { '': 'v0.0.1' }),
                repo,
                branchRef,
            ),
            '',
            goMod,
        ),
        {
            name: 'github.com/eighty4/sse',
            language: 'go',
            configFile: 'go.mod',
            path: '',
            version: 'v0.0.1',
        },
    )
})
