import type {
    QRepoDefaultBranchGraph,
    QRepoDefaultBranchVars,
    QRepoMultipleObjectContentsGraph,
    QRepoMultipleObjectContentsVars,
    QViewerAndExplicitRepoHeadOidsGraph,
    QViewerRepoUserContextGraph,
    QViewerRepoUserContextVars,
} from '@sidelines/github/GRAPHS'
import {
    makeRepoPackagesQRepoMultipleObjectContentsGraph,
    type PackageHint,
} from './github/graphs/packages.ts'
import type { UserStory } from './github/UserStory.ts'
import { userStoryWithSidelinesRepo } from './login.ts'

export type ProjectPageUserStoryOpts = {
    login?: string
    repo?: {
        owner?: string
        name?: string
    }
    defaultBranch?: {
        oid?: string
    }
    packageHintContents?: Partial<Record<PackageHint, string>>
}

export function userStoryProjectPage(
    opts?: ProjectPageUserStoryOpts,
): UserStory {
    return userStoryWithSidelinesRepo()
        .withGraphqlResponse('QViewerAndExplicitRepoHeadOids', null, {
            viewer: {
                repositories: {
                    nodes: [],
                    pageInfo: {
                        endCursor: null,
                        hasNextPage: false,
                    },
                },
            },
        } satisfies QViewerAndExplicitRepoHeadOidsGraph)
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
            makeRepoPackagesQRepoMultipleObjectContentsGraph(
                opts?.packageHintContents || {},
            ) satisfies QRepoMultipleObjectContentsGraph,
        )
}
