import { expect, test } from 'bun:test'
import type { RepositoryId } from '@sidelines/model'
import {
    parseCargoToml,
    parsePackageInCargoToml,
    parseWorkspaceInCargoToml,
} from './parseCargoToml.ts'
import { TestFindPackagesApi } from '../_testFindPackages.ts'
import type { RepoBranchReference } from '../../../repository/getRepoDefaultBranch.ts'

const repo = { name: 'maestro' } as RepositoryId
const branchRef = { headOid: 'abcdefg' } as RepoBranchReference

test('rust package .name .version and .publish in [package]', async () => {
    const toml = `[package]\nname = "cquill"\nversion = "0.0.1"\npublish = false`
    expect(
        await parseCargoToml(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            toml,
        ),
    ).toStrictEqual({
        name: 'cquill',
        version: '0.0.1',
        private: true,
        path: '',
        language: 'rust',
        configFile: 'Cargo.toml',
    })
})

test('rust package defaults for [package]', async () => {
    const toml = `[package]\n`
    expect(
        await parseCargoToml(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            toml,
        ),
    ).toStrictEqual({
        name: 'maestro',
        version: 'abcdefg',
        private: false,
        path: '',
        language: 'rust',
        configFile: 'Cargo.toml',
    })
})

test('rust package without [package] or workspace.members', async () => {
    expect(
        await parseCargoToml(
            new TestFindPackagesApi(repo, branchRef, {}, {}),
            '',
            '',
        ),
    ).toStrictEqual(null)
})

test('rust package cargo.toml with explicit workspace paths', async () => {
    const clap = '[package]\nname = "clap-api"\nversion = "1"'
    expect(
        await parseCargoToml(
            new TestFindPackagesApi(
                repo,
                branchRef,
                { ['clap/Cargo.toml']: clap },
                {},
            ),
            '',
            'workspace.members = ["clap"]',
        ),
    ).toStrictEqual({
        language: 'rust',
        configFile: 'Cargo.toml',
        packages: [
            {
                name: 'clap-api',
                version: '1',
                path: 'clap',
                language: 'rust',
                configFile: 'Cargo.toml',
                private: false,
            },
        ],
    })
})

test('rust package cargo.toml with workspace and root crate', async () => {
    const clap = '[package]\nname = "clap-api"\nversion = "1"'
    expect(
        await parseCargoToml(
            new TestFindPackagesApi(
                repo,
                branchRef,
                { ['clap/Cargo.toml']: clap },
                {},
            ),
            '',
            'workspace.members = ["clap"]',
        ),
    ).toStrictEqual({
        language: 'rust',
        configFile: 'Cargo.toml',
        packages: [
            {
                name: 'clap-api',
                version: '1',
                path: 'clap',
                language: 'rust',
                configFile: 'Cargo.toml',
                private: false,
            },
        ],
    })
})

test('cargo.toml .name .version and .publish in [package]', () => {
    expect(
        parsePackageInCargoToml(
            `[package]\nname = "cquill"\nversion = "0.0.1"\npublish = false`,
        ),
    ).toStrictEqual({
        name: 'cquill',
        version: '0.0.1',
        private: true,
    })
})

test('cargo.toml .name .version and .publish in ["package"]', () => {
    expect(
        parsePackageInCargoToml(
            `["package"]\nname = "cquill"\nversion = "0.0.1"\npublish = false`,
        ),
    ).toStrictEqual({
        name: 'cquill',
        version: '0.0.1',
        private: true,
    })
})

test('cargo.toml undefined defaults for [package]', () => {
    expect(parsePackageInCargoToml(`[package]`)).toStrictEqual({})
})

test('cargo.toml .members in [workspace]', () => {
    expect(
        parseWorkspaceInCargoToml(`[workspace]\nmembers = [\n"cli", "git"\n]`),
    ).toStrictEqual(['cli', 'git'])
})

test('cargo.toml .members in workspace.members', () => {
    expect(
        parseWorkspaceInCargoToml(`workspace.members = ["cli", "git"]`),
    ).toStrictEqual(['cli', 'git'])
})
