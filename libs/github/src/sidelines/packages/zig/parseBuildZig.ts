import type { Package } from '@sidelines/model'
import { type FindPackagesApi } from '../findPackagesApi.ts'

export async function parseBuildZig(
    findPackages: FindPackagesApi,
    path: string,
    buildManifest: string | null,
): Promise<Package<'zig'>> {
    const zon = buildManifest ? parseZon(buildManifest) : null
    const name = zon?.name || findPackages.repo.name
    const version = zon?.version || (await findPackages.getTagOrSha(''))
    return {
        name,
        version,
        path,
        language: 'zig',
        configFile: 'build.zig',
    }
}

export type Zon = {
    name?: string
    version?: string
}

export function parseZon(s: string): Zon {
    const zon: Zon = {}
    const NAME = /\.name\s*=\s*(?:\.(?<nameE>[a-z_]+)|"(?<nameS>[a-z_]+)")\s*,/
    const nameMatch = s.match(NAME)
    if (nameMatch?.groups) {
        zon.name = nameMatch.groups['nameE'] || nameMatch.groups['nameS']
    }
    const VERSION = /\.version\s*=\s*"(?<version>[a-z\d-+._]+)"\s*,/
    const versionMatch = s.match(VERSION)
    if (versionMatch?.groups) {
        zon.version = versionMatch.groups['version']
    }
    return zon
}
