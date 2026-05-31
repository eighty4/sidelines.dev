import type {
    QRepoDefaultBranchGraph,
    QRepoDefaultBranchVars,
    QRepoMultipleObjectContentsGraph,
    QRepoMultipleObjectContentsVars,
    QViewerRepoUserContextGraph,
    QViewerRepoUserContextVars,
} from '@sidelines/github/GRAPHS'
import type { UserStory } from './github/UserStory.ts'
import { userStoryWithSidelinesRepo } from './login.ts'

export type ProjectPageUserStoryOpts = {
    login?: string
    repo?: {
        owner?: string
        name?: string
    }
    defaultBranch?: {
        committedDate?: Date
        oid?: string
    }
    packageHintContents?: Partial<Record<PackageHint, string>>
}

export function userStoryProjectPage(
    opts?: ProjectPageUserStoryOpts,
): UserStory {
    const committedDate = opts?.defaultBranch?.committedDate || new Date()
    return userStoryWithSidelinesRepo()
        .withGraphqlResponse(
            'QViewerRepoUserContext',
            {
                owner: opts?.repo?.owner || 'eighty4',
                name: opts?.repo?.name || 'l3',
            } satisfies QViewerRepoUserContextVars,
            {
                viewer: {
                    login: opts?.login || 'eighty4',
                },
                repository: {
                    viewerPermission: 'ADMIN',
                },
            } satisfies QViewerRepoUserContextGraph,
        )
        .withGraphqlResponse(
            'QRepoDefaultBranch',
            {
                owner: opts?.repo?.owner || 'eighty4',
                name: opts?.repo?.name || 'l3',
            } satisfies QRepoDefaultBranchVars,
            {
                repository: {
                    defaultBranchRef: {
                        name: 'main',
                        target: {
                            history: {
                                edges: [
                                    {
                                        node: {
                                            committedDate:
                                                committedDate.toISOString(),
                                            oid:
                                                opts?.defaultBranch?.oid ||
                                                'abcabc12',
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            } satisfies QRepoDefaultBranchGraph,
        )
        .withGraphqlResponse(
            'QRepoMultipleObjectContents',
            {
                owner: opts?.repo?.owner || 'eighty4',
                name: opts?.repo?.name || 'l3',
            } satisfies QRepoMultipleObjectContentsVars,
            createQRepoMultipleObjectContentsGraph(
                opts?.packageHintContents || {},
            ) satisfies QRepoMultipleObjectContentsGraph,
        )
}

const PACKAGE_HINTS = [
    'pubspec.yaml',
    'go.mod',
    'package.json',
    'Cargo.toml',
    'build.zig',
    'build.zig.zon',
    'pnpm-workspace.yaml',
] as const

type PackageHint = (typeof PACKAGE_HINTS)[number]

function createQRepoMultipleObjectContentsGraph(
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
