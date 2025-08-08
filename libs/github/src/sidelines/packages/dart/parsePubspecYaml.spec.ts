import { expect, test } from 'bun:test'
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
    expect(
        await parsePubspecYaml(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            yaml,
        ),
    ).toStrictEqual({
        name: 'libtab',
        version: '1.1.1',
        path: '',
        language: 'dart',
        configFile: 'pubspec.yaml',
        private: false,
    })
})

test('dart package name from repo name', async () => {
    const yaml = `version: 1.1.1`
    expect(
        await parsePubspecYaml(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            yaml,
        ),
    ).toStrictEqual({
        name: 'picking.pl',
        version: '1.1.1',
        path: '',
        language: 'dart',
        configFile: 'pubspec.yaml',
        private: false,
    })
})

test('dart package version from git tag', async () => {
    expect(
        await parsePubspecYaml(
            new TestFindPackagesApi(repo, branchRef, {}, { '': '1.2.3' }),
            '',
            '',
        ),
    ).toStrictEqual({
        name: 'picking.pl',
        version: '1.2.3',
        path: '',
        language: 'dart',
        configFile: 'pubspec.yaml',
        private: false,
    })
})

test('dart package version from branch ref', async () => {
    expect(
        await parsePubspecYaml(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            '',
        ),
    ).toStrictEqual({
        name: 'picking.pl',
        version: 'abcdefg',
        path: '',
        language: 'dart',
        configFile: 'pubspec.yaml',
        private: false,
    })
})

test('dart package with explicit workspace paths', async () => {
    expect(
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
    ).toStrictEqual({
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
    })
})
