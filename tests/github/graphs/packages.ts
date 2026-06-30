import type { QRepoMultipleObjectContentsGraph } from '@sidelines/github/GRAPHS'

const PACKAGE_HINTS = [
    'pubspec.yaml',
    'go.mod',
    'package.json',
    'Cargo.toml',
    'build.zig',
    'build.zig.zon',
    'pnpm-workspace.yaml',
] as const

export type PackageHint = (typeof PACKAGE_HINTS)[number]

export function makeRepoPackagesQRepoMultipleObjectContentsGraph(
    contents: Partial<Record<PackageHint, string>>,
): QRepoMultipleObjectContentsGraph {
    return {
        repository: Object.fromEntries(
            PACKAGE_HINTS.map((filename, i) => [
                `obj${i}`,
                contents[filename] ? { text: contents[filename] } : null,
            ]),
        ),
    }
}
