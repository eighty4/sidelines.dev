import { expect, test } from 'bun:test'
import type { RepositoryId } from '@sidelines/model'
import { parsePackageJson } from './parsePackageJson.ts'
import { TestFindPackagesApi } from '../_testFindPackages.ts'
import type { RepoBranchReference } from '../../../repository/getRepoDefaultBranch.ts'

const repo: RepositoryId = { owner: '', name: '' }
const branchRef: RepoBranchReference = {
    name: '',
    headOid: '',
    committedDate: new Date(),
}

test('js package standalone package', async () => {
    const packageJson = JSON.stringify({
        name: '@eighty4/changelog',
        version: '0.0.8',
    })
    expect(
        await parsePackageJson(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            packageJson,
            null,
        ),
    ).toStrictEqual({
        name: '@eighty4/changelog',
        version: '0.0.8',
        language: 'js',
        configFile: 'package.json',
        path: '',
        private: false,
    })
})

test('js package bun or npm workspace with explicit path', async () => {
    const rootPackageJson = JSON.stringify({
        name: '@eighty4/plunder',
        version: '0.0.0',
        workspaces: ['core'],
    })
    const files = {
        'core/package.json': JSON.stringify({
            name: '@eighty4/plunder-core',
            version: '0.0.8',
        }),
    }
    expect(
        await parsePackageJson(
            new TestFindPackagesApi(repo, branchRef, files, {}),
            '',
            rootPackageJson,
            null,
        ),
    ).toStrictEqual({
        language: 'js',
        configFile: 'package.json',
        path: '',
        root: {
            name: '@eighty4/plunder',
            version: '0.0.0',
            language: 'js',
            configFile: 'package.json',
            path: '',
            private: false,
        },
        packages: [
            {
                name: '@eighty4/plunder-core',
                version: '0.0.8',
                language: 'js',
                configFile: 'package.json',
                path: 'core',
                private: false,
            },
        ],
    })
})

test('js package pnpm workspace with explicit path', async () => {
    const rootPackageJson = JSON.stringify({
        name: '@eighty4/plunder',
        version: '0.0.0',
    })
    const files = {
        'core/package.json': JSON.stringify({
            name: '@eighty4/plunder-core',
            version: '0.0.8',
        }),
    }
    expect(
        await parsePackageJson(
            new TestFindPackagesApi(repo, branchRef, files, {}),
            '',
            rootPackageJson,
            `packages:\n  - core`,
        ),
    ).toStrictEqual({
        language: 'js',
        configFile: 'package.json',
        path: '',
        root: {
            name: '@eighty4/plunder',
            version: '0.0.0',
            language: 'js',
            configFile: 'package.json',
            path: '',
            private: false,
        },
        packages: [
            {
                name: '@eighty4/plunder-core',
                version: '0.0.8',
                language: 'js',
                configFile: 'package.json',
                path: 'core',
                private: false,
            },
        ],
    })
})

test.skip('js package bun or npm with wildcard path', async () => {
    const rootPackageJson = JSON.stringify({
        name: '@eighty4/plunder',
        version: '0.0.0',
        workspaces: ['packages/*'],
    })
    const files = {
        'packages/core/package.json': JSON.stringify({
            name: '@eighty4/plunder-core',
            version: '0.0.8',
        }),
    }
    expect(
        await parsePackageJson(
            new TestFindPackagesApi(repo, branchRef, files, {}),
            '',
            rootPackageJson,
            null,
        ),
    ).toStrictEqual({
        language: 'js',
        configFile: 'package.json',
        path: '',
        root: {
            name: '@eighty4/plunder',
            version: '0.0.0',
            language: 'js',
            configFile: 'package.json',
            path: '',
            private: false,
        },
        packages: [
            {
                name: '@eighty4/plunder-core',
                version: '0.0.8',
                language: 'js',
                configFile: 'package.json',
                path: 'packages/core',
                private: false,
            },
        ],
    })
})
