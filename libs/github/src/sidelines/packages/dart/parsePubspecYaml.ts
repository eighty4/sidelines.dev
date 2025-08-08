import type { Package, PackageWorkspace } from '@sidelines/model'
import { type FindPackagesApi, topYamlList } from '../findPackagesApi.ts'

// todo track for workspace glob support
//  https://github.com/dart-lang/pub/issues/4391

export async function parsePubspecYaml(
    findPackages: FindPackagesApi,
    path: string,
    pkgPubspec: string,
): Promise<PackageWorkspace<'dart'> | Package<'dart'>> {
    const workspacePaths = topYamlList('workspace:', pkgPubspec)
    if (workspacePaths?.length) {
        const files = await findPackages.workspaceConfigs(
            path,
            workspacePaths,
            'pubspec.yaml',
        )
        return {
            language: 'dart',
            configFile: 'pubspec.yaml',
            path,
            // root: await createPackage(tagFetcher, repo, branchRef, path, pkgPubspec),
            packages: await Promise.all(
                Object.entries(files)
                    .map(([wsPkgPath, wsPkgPubspec]) => {
                        return wsPkgPubspec === null
                            ? null
                            : createPackage(
                                  findPackages,
                                  wsPkgPath,
                                  wsPkgPubspec,
                              )
                    })
                    .filter(pkg => pkg !== null),
            ),
        }
    } else {
        return await createPackage(findPackages, path, pkgPubspec)
    }
}

async function createPackage(
    findPackages: FindPackagesApi,
    path: string,
    pubspecYaml: string,
): Promise<Package<'dart'>> {
    const name = findStr(pubspecYaml, NAME) || findPackages.repo.name
    const version =
        findStr(pubspecYaml, VERSION) || (await findPackages.getTagOrSha(''))
    return {
        name,
        version,
        path,
        language: 'dart',
        configFile: 'pubspec.yaml',
        private: isPrivate(pubspecYaml),
    }
}

const NAME = /name\s*:\s*(?<v>['"]?[a-z][a-z\d_]*['"]?)\s*/
const VERSION = /version\s*:\s*(?<v>['"]?[a-z\d-+._]+['"]?)\s*/

function findStr(yaml: string, rgx: RegExp): string | null {
    const match = yaml.match(rgx)
    if (match?.groups) {
        const s = match.groups['v']
        if (/^['"]/.test(s) && /['"]$/.test(s)) {
            return s.substring(1, s.length - 1)
        } else {
            return s
        }
    } else {
        return null
    }
}

function isPrivate(yaml: string): boolean {
    return /publish_to\s*:(?:(?!\n)\s)+none/.test(yaml)
}
