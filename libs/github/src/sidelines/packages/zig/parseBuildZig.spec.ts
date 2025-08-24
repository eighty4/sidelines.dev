import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { RepositoryId } from '@sidelines/model'
import { parseBuildZig, parseZon } from './parseBuildZig.ts'
import { TestFindPackagesApi } from '../_testFindPackages.ts'
import type { RepoBranchReference } from '../../../repository/getRepoDefaultBranch.ts'

test('zig parse zig.build.zon modern', () => {
    assert.deepEqual(
        parseZon(`.{\n.name = .ghostty,\n.version = "1.1.4",\n}`),
        {
            name: 'ghostty',
            version: '1.1.4',
        },
    )
})

test('zig parse zig.build.zon legacy', () => {
    assert.deepEqual(
        parseZon(`.{\n.name = "ghostty",\n.version = "1.1.4",\n}`),
        {
            name: 'ghostty',
            version: '1.1.4',
        },
    )
})

const repo: RepositoryId = { name: 'ZON', owner: '' }

const branchRef: RepoBranchReference = {
    headOid: 'abcdefgXXX',
    name: '',
    committedDate: new Date(),
}

test('zig package name from repo name', async () => {
    assert.deepEqual(
        await parseBuildZig(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            null,
        ),
        {
            name: 'ZON',
            path: '',
            version: 'abcdefg',
            language: 'zig',
            configFile: 'build.zig',
        },
    )
})

test('zig package name from zon modern', async () => {
    const zon = `.{.name = .ghostty,.version = "1.1.4",}`
    assert.deepEqual(
        await parseBuildZig(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            zon,
        ),
        {
            name: 'ghostty',
            path: '',
            version: '1.1.4',
            language: 'zig',
            configFile: 'build.zig',
        },
    )
})

test('zig package name from zon legacy', async () => {
    const zon = `.{.name = "ghostty",.version = "1.1.4",}`
    assert.deepEqual(
        await parseBuildZig(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            zon,
        ),
        {
            name: 'ghostty',
            path: '',
            version: '1.1.4',
            language: 'zig',
            configFile: 'build.zig',
        },
    )
})

test('zig package version from branch sha', async () => {
    assert.deepEqual(
        await parseBuildZig(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            null,
        ),
        {
            name: 'ZON',
            path: '',
            version: 'abcdefg',
            language: 'zig',
            configFile: 'build.zig',
        },
    )
})

test('zig package version from latest release tag', async () => {
    assert.deepEqual(
        await parseBuildZig(
            new TestFindPackagesApi(repo, branchRef, {}, { '': 'v1.1.4' }),
            '',
            null,
        ),
        {
            name: 'ZON',
            path: '',
            version: 'v1.1.4',
            language: 'zig',
            configFile: 'build.zig',
        },
    )
})

test('zig package version from zon', async () => {
    const zon = `.{.name = .ghostty,.version = "1.1.4",}`
    assert.deepEqual(
        await parseBuildZig(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            zon,
        ),
        {
            name: 'ghostty',
            path: '',
            version: '1.1.4',
            language: 'zig',
            configFile: 'build.zig',
        },
    )
})
