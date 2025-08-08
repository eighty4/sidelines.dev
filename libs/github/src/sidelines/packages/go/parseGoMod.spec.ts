import { expect, test } from 'bun:test'
import type { RepositoryId } from '@sidelines/model'
import { extractName, parseGoMod } from './parseGoMod.ts'
import { TestFindPackagesApi } from '../_testFindPackages.ts'
import type { RepoBranchReference } from '../../../repository/getRepoDefaultBranch.ts'

const MOD = 'github.com/eighty4/sse'

test('extract module name from go.mod', () => {
    expect(extractName(`module ${MOD}`)).toBe(MOD)
    expect(extractName(`\nmodule ${MOD}\n`)).toBe(MOD)
    expect(extractName(`go 1.22\nmodule ${MOD}\n`)).toBe(MOD)
})

const repo: RepositoryId = { owner: 'eighty4', name: 'maestro' }

const branchRef: RepoBranchReference = {
    headOid: 'abcdefgXXX',
    name: '',
    committedDate: new Date(),
}

test('go package name from go.mod', async () => {
    const goMod = `module ${MOD}`
    expect(
        await parseGoMod(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            goMod,
        ),
    ).toStrictEqual({
        name: 'github.com/eighty4/sse',
        language: 'go',
        configFile: 'go.mod',
        path: '',
        version: 'abcdefg',
    })
})

test('go package name from repo name', async () => {
    const goMod = `no errors`
    expect(
        await parseGoMod(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            goMod,
        ),
    ).toStrictEqual({
        name: 'github.com/eighty4/maestro',
        language: 'go',
        configFile: 'go.mod',
        path: '',
        version: 'abcdefg',
    })
})

test('go package version from sha', async () => {
    const goMod = `module ${MOD}`
    expect(
        await parseGoMod(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            goMod,
        ),
    ).toStrictEqual({
        name: 'github.com/eighty4/sse',
        language: 'go',
        configFile: 'go.mod',
        path: '',
        version: 'abcdefg',
    })
})

test('go package version from tag', async () => {
    const goMod = `module ${MOD}`
    expect(
        await parseGoMod(
            new TestFindPackagesApi(repo, branchRef, {}, { '': 'v0.0.1' }),
            '',
            goMod,
        ),
    ).toStrictEqual({
        name: 'github.com/eighty4/sse',
        language: 'go',
        configFile: 'go.mod',
        path: '',
        version: 'v0.0.1',
    })
})
