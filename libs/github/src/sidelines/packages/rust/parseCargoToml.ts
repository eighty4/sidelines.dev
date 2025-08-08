import type { Package, PackageWorkspace } from '@sidelines/model'
import type { FindPackagesApi } from '../findPackagesApi.ts'

// todo workspace glob paths
//  https://docs.rs/glob/0.3.0/glob/struct.Pattern.html

export async function parseCargoToml(
    findPackages: FindPackagesApi,
    path: string,
    toml: string,
): Promise<PackageWorkspace<'rust'> | Package<'rust'> | null> {
    const wsMembers = parseWorkspaceInCargoToml(toml)
    const rootCrate = parsePackageInCargoToml(toml)
    if (!wsMembers?.length) {
        return rootCrate
            ? await createPackage(findPackages, path, rootCrate)
            : null
    } else {
        const wsPkg: PackageWorkspace<'rust'> = {
            language: 'rust',
            configFile: 'Cargo.toml',
            packages: await collectWsPackages(findPackages, path, wsMembers),
        }
        if (rootCrate) {
            wsPkg.root = await createPackage(findPackages, path, rootCrate)
        }
        return wsPkg
    }
}

// todo method of FindPackagesApi
async function collectWsPackages(
    findPackages: FindPackagesApi,
    path: string,
    wsMembers: Array<string>,
): Promise<Array<Package<'rust'>>> {
    return await Promise.all(
        Object.entries(
            await findPackages.workspaceConfigs(path, wsMembers, 'Cargo.toml'),
        )
            .map(([wsPkgPath, content]) => {
                if (content) {
                    const wsPackage = parsePackageInCargoToml(content)
                    if (wsPackage) {
                        return createPackage(findPackages, wsPkgPath, wsPackage)
                    }
                }
                return null
            })
            .filter(pkg => pkg !== null),
    )
}

async function createPackage(
    findPackages: FindPackagesApi,
    path: string,
    pkg: Partial<Pick<Package<any>, 'name' | 'version' | 'private'>>,
): Promise<Package<'rust'>> {
    return {
        name: pkg.name || findPackages.repo.name,
        version: pkg.version || (await findPackages.getTagOrSha('')),
        language: 'rust',
        configFile: 'Cargo.toml',
        path,
        private: pkg.private || false,
    }
}

const TABLE_NAME =
    /^(?:(?!\n)\s)*\[(?:(?!\n)\s)*(?:(?<tableName>[a-z\d_-]+)|(?:["'])(?<tableNameString>(?:[.a-z\d_-]|(?:(?!\n)\s))+)(?:["']))(?:(?!\n)\s)*\](?:(?!\n)\s)*$/

const KV_BOOLEAN = /^\s*(?<k>[a-z]+)\s*=\s*(?<v>true|false)\s*$/

const KV_STRING = /^\s*(?<k>[a-z]+)\s*=\s*["'](?<v>.*)["']\s*$/

// todo top level assignments
//  `package.name = ""`
//  `package.version = ""`
export function parsePackageInCargoToml(
    toml: string,
): Partial<Pick<Package<any>, 'name' | 'version' | 'private'>> | null {
    let pkg: Partial<
        Pick<Package<any>, 'name' | 'version' | 'private'>
    > | null = null
    const lines = toml.split('\n')
    for (let i = 0; i < lines.length; i++) {
        const tableNameMatch = lines[i].match(TABLE_NAME)
        if (tableNameMatch?.groups) {
            const tableName =
                tableNameMatch.groups['tableName'] ||
                tableNameMatch.groups['tableNameString']
            if (tableName === 'package') {
                pkg = {}
                while (i + 1 < lines.length) {
                    i++
                    if (/^\s*\[/.test(lines[i])) {
                        break
                    } else {
                        const kvStringMatch = lines[i].match(KV_STRING)
                        if (kvStringMatch?.groups) {
                            const { k, v } = kvStringMatch.groups
                            if (k === 'name') {
                                pkg.name = v
                            } else if (k === 'version') {
                                pkg.version = v
                            }
                        } else {
                            const kvBooleanMatch = lines[i].match(KV_BOOLEAN)
                            if (kvBooleanMatch?.groups) {
                                const { k, v } = kvBooleanMatch.groups
                                if (k === 'publish' && v === 'false') {
                                    pkg.private = true
                                }
                            }
                        }
                    }
                    if (
                        pkg.name &&
                        pkg.version &&
                        typeof pkg.private !== 'undefined'
                    ) {
                        break
                    }
                }
            }
        }
    }
    return pkg
}

export function parseWorkspaceInCargoToml(toml: string): Array<string> | null {
    let wsTableMembersIndex = toml.lastIndexOf('[workspace]')
    if (wsTableMembersIndex !== -1) {
        wsTableMembersIndex = toml
            .substring(wsTableMembersIndex)
            .search(/members\s*=\s*\[/)
    }
    let wsDotMembersIndex = -1
    if (/workspace\.members\s*=\s*\[/.test(toml)) {
        wsDotMembersIndex = toml.lastIndexOf('workspace.members') + 10
    }
    if (wsTableMembersIndex === -1 && wsDotMembersIndex === -1) {
        return null
    }
    const membersStart = Math.max(wsTableMembersIndex, wsDotMembersIndex)
    const arrayStart = toml.indexOf('[', membersStart)
    const arrayContent = toml.substring(
        arrayStart + 1,
        toml.indexOf(']', arrayStart),
    )
    return arrayContent
        .split(',')
        .map(member => {
            try {
                return JSON.parse(member)
            } catch (e) {
                return null
            }
        })
        .filter(item => item !== null)
}
