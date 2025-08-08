import type { Package, PackageWorkspace } from '@sidelines/model'
import { type FindPackagesApi, topYamlList } from '../findPackagesApi.ts'

// todo bun, pnpm and npm workspace glob syntax

export async function parsePackageJson(
    findPackages: FindPackagesApi,
    path: string,
    // content of `package.json` at path
    packageJsonStr: string,
    // content of `pnpm-workspace.yaml` at path
    pnpmWorkspacesStr: string | null,
): Promise<PackageWorkspace<'js'> | Package<'js'>> {
    const packageJson = JSON.parse(packageJsonStr)
    const workspacePaths = readWorkspacePaths(packageJson, pnpmWorkspacesStr)
    if (!workspacePaths?.length) {
        return createPackageModel(packageJson, path)
    } else {
        const files = await findPackages.workspaceConfigs(
            path,
            workspacePaths,
            'package.json',
        )
        return {
            language: 'js',
            configFile: 'package.json',
            path,
            root: createPackageModel(packageJson, path),
            packages: Object.entries(files)
                .map(([wsPkgPath, content]) => {
                    return content === null
                        ? null
                        : parsePackageModel(content, wsPkgPath)
                })
                .filter(pkg => pkg !== null),
        }
    }
}

function createPackageModel(packageJson: any, path: string): Package<'js'> {
    return {
        name: packageJson.name,
        version: packageJson.version,
        language: 'js',
        configFile: 'package.json',
        path,
        private: packageJson.private === true,
    }
}

function parsePackageModel(
    packageJsonStr: string,
    path: string,
): Package<'js'> {
    return createPackageModel(JSON.parse(packageJsonStr), path)
}

// todo verify package manager
function readWorkspacePaths(
    packageJson: any,
    pnpmWorkspacesStr: string | null,
): Array<string> | null {
    if (
        Array.isArray(packageJson.workspaces) &&
        packageJson.workspaces.length
    ) {
        return packageJson.workspaces
    } else if (pnpmWorkspacesStr) {
        return topYamlList('packages:', pnpmWorkspacesStr)
    }
    return null
}
