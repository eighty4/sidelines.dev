import type { RepositoryId, RepositoryPackage } from '@sidelines/model'
import { type FindPackagesApi, FindPackagesApiImpl } from './findPackagesApi.ts'
import { parsePubspecYaml } from './dart/parsePubspecYaml.ts'
import { parseGoMod } from './go/parseGoMod.ts'
import { parsePackageJson } from './js/parsePackageJson.ts'
import { parseCargoToml } from './rust/parseCargoToml.ts'
import { parseBuildZig } from './zig/parseBuildZig.ts'
import {
    getMultipleRepoObjectContents,
    type RepoBranchReference,
} from '../../index.ts'

// avoids parse errors or missing data by defaulting package data
// package name -> repo name + path
// version -> latest semver git tag || default branch head oid
export async function findRepoPackages(
    ghToken: string | null,
    repo: RepositoryId,
    branchRef: RepoBranchReference,
): Promise<Array<RepositoryPackage> | 'repo-not-found'> {
    // todo parallel query bun, npm and pnpm lock files to determine package manager
    //  create a similar query to getMultipleRepoObjectContents that returns booleans
    //  to check if file exists without transferring blob
    // todo refactor graphql querying to support merging multiple queries in 1 request
    const cats = await getMultipleRepoObjectContents(
        ghToken,
        repo,
        [
            'pubspec.yaml',
            'go.mod',
            'package.json',
            'Cargo.toml',
            // todo build.zig check exists, content is not necessary
            'build.zig',
            'build.zig.zon',
            'pnpm-workspace.yaml',
        ],
        branchRef.headOid,
    )
    if (cats === 'repo-not-found') {
        return 'repo-not-found'
    }
    // logic all works for subdir roots of a repo as well as root dir
    // however, only parsing root dir configs as of now and hard-coding path for root dir
    const PATH = ''
    // if getMultipleRepoObjectContents of root dir was supplemented with
    // package configs from a full repo search, PATH would be replaced with
    // each package's subdir

    const findPackagesApi: FindPackagesApi = new FindPackagesApiImpl(
        ghToken,
        repo,
        branchRef,
    )
    type ParsingPackages = Promise<
        Array<RepositoryPackage> | RepositoryPackage | null
    >
    const parsing: Array<ParsingPackages> = []
    for (const [filename, cat] of Object.entries(cats)) {
        if (cat) {
            if (filename === 'package.json') {
                parsing.push(
                    parsePackageJson(
                        findPackagesApi,
                        PATH,
                        cat,
                        cats['pnpm-workspace.yaml'],
                    ),
                )
            } else if (filename === 'go.mod') {
                parsing.push(parseGoMod(findPackagesApi, PATH, cat))
            } else if (filename === 'Cargo.toml') {
                parsing.push(parseCargoToml(findPackagesApi, PATH, cat))
            } else if (filename === 'pubspec.yaml') {
                parsing.push(parsePubspecYaml(findPackagesApi, PATH, cat))
            } else if (filename === 'build.zig') {
                parsing.push(
                    parseBuildZig(findPackagesApi, PATH, cats['build.zig.zon']),
                )
            }
        }
    }
    const packages: Array<RepositoryPackage> = []
    for (const result of await Promise.all(parsing)) {
        if (result !== null) {
            if (Array.isArray(result)) {
                packages.push(...result)
            } else {
                packages.push(result)
            }
        }
    }
    return packages
}

// requires authenticated user and repo to be indexed
// async function viaSearchCodeApi(
//     ghToken: string,
//     repo: RepositoryId,
// ): Promise<Array<Package<any>>> {
//     const searchResults = await searchCode(ghToken, {
//         kind: 'in:path',
//         qualifiers: [
//             { type: 'repo', term: `${repo.owner}/${repo.name}` },
//             { type: 'filename', term: 'pubspec.yaml' },
//             { type: 'filename', term: 'go.mod' },
//             { type: 'filename', term: 'package.json' },
//             { type: 'filename', term: 'Cargo.toml' },
//             { type: 'filename', term: 'build.zig' },
//         ],
//         term: '',
//     })
//     console.log(searchResults)
//     throw Error('look up')
// }
