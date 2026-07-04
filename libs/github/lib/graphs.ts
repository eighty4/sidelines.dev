import type { RepoNameWithOwner } from '@sidelines/model'
import type { PageInfo } from './pagingGraphqlQueries.ts'

/**
 * Exporting Q*Graph and Q*Vars types for Playwright testing.
 * Ideally, my graphql schema integration would be advanced
 * enough to generate the resulting graph types as well.
 *
 * In that case, the graphql query types could be generated
 * into its own package, and not an ancilliary export
 * from `@sidelines/github` just for Playwright testing.
 */

/*************************************************/
/*** MODELED GRAPHS REUSED IN MULTIPLE QUERIES ***/
/*************************************************/

/* Repository.defaultBranchRef */

export type MRepoDefaultBranch = {
    name: string
    target: {
        history: {
            edges: Array<{
                node: {
                    oid: string
                }
            }>
        }
    }
}

/*************************************************************/
/*** GRAPHS OF QUERIED DATA FROM GRAPHQL GENERATED QUERIES ***/
/*************************************************************/

/* QCheckSidelinesRepoGraph */

export type QCheckSidelinesRepoGraph = {
    viewer: {
        repository: {
            homepageUrl: string
            isPrivate: boolean
        }
    }
}

/* QViewerReposNames */

export type { QViewerReposNamesVars } from './repositories/gql.ts'

export type QViewerReposNamesGraph = {
    viewer: {
        login: string
        repositories: {
            nodes: Array<{
                name: string
                owner: {
                    login: string
                }
            }>
            pageInfo: PageInfo
        }
    }
}

/* QMultipleReposLatestTags */

export type QMultipleReposLatestTagsVars = { tags: number }

export type QMultipleReposLatestTagsGraph = Record<
    `repo${string}`,
    null | {
        refs: {
            edges: Array<{
                node: {
                    name: string
                }
            }>
        }
    }
>

/* QRepoObject */

export type { QRepoObjectVars } from './repository/objects/gql.ts'

export type QRepoObjectGraph = {
    repository: {
        object:
            | {
                  __typename: 'Tree'
                  entries: Array<
                      | {
                            type: 'tree'
                            name: string
                        }
                      | {
                            type: 'blob'
                            name: string
                            object: {
                                byteSize: number
                                isBinary: boolean
                            }
                        }
                  >
              }
            | {
                  __typename: 'Blob'
                  byteSize: number
                  isBinary: boolean
              }
            | {
                  __typename: 'Commit'
              }
    }
}

/* QViewerAndExplicitRepoHeadOids */

export type QViewerAndExplicitRepoHeadOidsGraph = {
    [repo: `r${number}`]: null | {
        defaultBranchRef: null | MRepoDefaultBranch
    }
    viewer: {
        repositories: {
            nodes: Array<{
                nameWithOwner: RepoNameWithOwner
                defaultBranchRef: null | MRepoDefaultBranch
            }>
            pageInfo: PageInfo
        }
    }
}

/* QRepoDefaultBranch */

export type { QRepoDefaultBranchVars } from './repository/gql.ts'

export type QRepoDefaultBranchGraph = {
    repository?: {
        defaultBranchRef: {
            name: string
            target: {
                history: {
                    edges: Array<{
                        node: {
                            oid: string
                        }
                    }>
                }
            }
        }
    }
}

/* QViewerRepoDefaultBranch */

export type QViewerRepoDefaultBranchGraph = {
    viewer: QRepoDefaultBranchGraph
}

/* QViewerRepoDirContents */

export type { QViewerRepoDirContentsVars } from './repository/objects/gql.ts'

export type QViewerRepoDirContentsGraph = {
    viewer: {
        repository: {
            object: {
                entries: Array<
                    {
                        name: string
                    } & (
                        | {
                              type: 'blob'
                              object: {
                                  text: string
                              }
                          }
                        | {
                              type: 'tree'
                          }
                    )
                >
            }
        }
    }
}

/* QViewerRepoDefaultBranchDirContents */

export type { QViewerRepoDefaultBranchDirContentsVars } from './repository/objects/gql.ts'

export type QViewerRepoDefaultBranchDirContentsGraph = {
    viewer: {
        repository?: {
            defaultBranchRef: {
                name: string
                target: {
                    history: {
                        edges: Array<{
                            node: {
                                oid: string
                            }
                        }>
                    }
                }
            }
            object?: {
                entries: Array<
                    {
                        name: string
                    } & (
                        | {
                              type: 'blob'
                              object: {
                                  text: string
                              }
                          }
                        | {
                              type: 'tree'
                          }
                    )
                >
            }
        }
    }
}

/* QViewerRepoUserContext */

export type { QViewerRepoUserContextVars } from './repository/gql.ts'

// https://docs.github.com/en/graphql/reference/enums#repositorypermission
export type RepoPermission = 'ADMIN' | 'MAINTAIN' | 'READ' | 'TRIAGE' | 'WRITE'

export type QViewerRepoUserContextGraph = {
    viewer: {
        login: string
    }
    repository: {
        viewerPermission: RepoPermission
    } | null
}

/*********************************************************************/
/*** GRAPHS OF DYNAMICALLY BUILT QUERIES, NOT GENERATED BY GRAPHQL ***/
/*********************************************************************/

export type QRepoMultipleObjectContentsVars = {
    owner: string
    name: string
}

export type QRepoMultipleObjectContentsGraph = {
    repository: Record<
        `obj${number}`,
        {
            text: string
        } | null
    >
}
