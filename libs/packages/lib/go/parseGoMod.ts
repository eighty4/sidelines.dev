import type { Package } from '@sidelines/model'
import type { FindPackagesApi } from '../findPackagesApi.ts'

// todo check go.mod's `require` declarations for subpackage modules within this repo
export async function parseGoMod(
    findPackages: FindPackagesApi,
    path: string,
    goMod: string,
): Promise<Package<'go'>> {
    // go module release tag `subdir/v0.0.1` needs `subdir/` tagPrefix for query
    const tagPrefix = path.length ? `${path}/` : path
    const gettingSemver = findPackages.getTagOrSha(tagPrefix)
    const name =
        extractName(goMod) ||
        `github.com/${findPackages.repo.owner}/${findPackages.repo.name}`
    const version = await gettingSemver
    return {
        name,
        version,
        language: 'go',
        configFile: 'go.mod',
        path,
    }
}

export function extractName(goMod: string): string | null {
    let lineStart = 0
    for (let i = 0; i < goMod.length; i++) {
        if (goMod.charAt(i) === '\n' || i + 1 === goMod.length) {
            const line = goMod.substring(lineStart, i + 1)
            if (/^\s*module\s/.test(line)) {
                return line.trim().substring(6).trim()
            }
            lineStart = i
        }
    }
    return null
}
