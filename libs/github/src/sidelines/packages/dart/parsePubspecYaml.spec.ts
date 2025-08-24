import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { RepositoryId } from '@sidelines/model'
import { parsePubspecYaml } from './parsePubspecYaml.ts'
import { TestFindPackagesApi } from '../_testFindPackages.ts'
import type { RepoBranchReference } from '../../../repository/getRepoDefaultBranch.ts'

const repo: RepositoryId = { owner: 'eighty4', name: 'picking.pl' }

const branchRef: RepoBranchReference = {
    name: 'main',
    headOid: 'abcdefgXXX',
    committedDate: new Date(),
}

test('dart package name and version from pubspec.yaml', async () => {
    const yaml = `name: libtab\nversion: 1.1.1`
    assert.deepEqual(
        await parsePubspecYaml(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            yaml,
        ),
        {
            name: 'libtab',
            version: '1.1.1',
            path: '',
            language: 'dart',
            configFile: 'pubspec.yaml',
            private: false,
        },
    )
})

test('dart package name from repo name', async () => {
    const yaml = `version: 1.1.1`
    assert.deepEqual(
        await parsePubspecYaml(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            yaml,
        ),
        {
            name: 'picking.pl',
            version: '1.1.1',
            path: '',
            language: 'dart',
            configFile: 'pubspec.yaml',
            private: false,
        },
    )
})

test('dart package version from git tag', async () => {
    assert.deepEqual(
        await parsePubspecYaml(
            new TestFindPackagesApi(repo, branchRef, {}, { '': '1.2.3' }),
            '',
            '',
        ),
        {
            name: 'picking.pl',
            version: '1.2.3',
            path: '',
            language: 'dart',
            configFile: 'pubspec.yaml',
            private: false,
        },
    )
})

test('dart package version from branch ref', async () => {
    assert.deepEqual(
        await parsePubspecYaml(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            '',
        ),
        {
            name: 'picking.pl',
            version: 'abcdefg',
            path: '',
            language: 'dart',
            configFile: 'pubspec.yaml',
            private: false,
        },
    )
})

test('dart package with explicit workspace paths', async () => {
    assert.deepEqual(
        await parsePubspecYaml(
            new TestFindPackagesApi(
                repo,
                branchRef,
                { 'abc/pubspec.yaml': 'name: libtab\nversion: 1.1.1' },
                {},
            ),
            '',
            '\n\nworkspace:\n  - abc\n\n',
        ),
        {
            path: '',
            language: 'dart',
            configFile: 'pubspec.yaml',
            packages: [
                {
                    name: 'libtab',
                    version: '1.1.1',
                    path: 'abc',
                    language: 'dart',
                    configFile: 'pubspec.yaml',
                    private: false,
                },
            ],
        },
    )
})
