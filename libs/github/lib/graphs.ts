export type { QViewerReposNamesVars } from './repositories/gql.ts'

export type {
    QViewerRepoDirContentVars,
    QRepoObjectVars,
} from './repository/objects/gql.ts'

export type QCheckSidelinesRepoGraph = {
    viewer: {
        repository: {
            homepageUrl: string
            isPrivate: boolean
        }
    }
}

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

export type QRepoDefaultBranchGraph = {
    repository: {
        defaultBranchRef: {
            name: string
            target: {
                history: {
                    edges: Array<{
                        node: {
                            name: string
                            oid: string
                            committedDate: string
                        }
                    }>
                }
            }
        }
    }
}

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

export type QViewerReposNamesGraph = {
    viewer: {
        repositories: {
            nodes: Array<{
                name: string
                owner: {
                    login: string
                }
            }>
            pageInfo: {
                endCursor: string | null
                hasNextPage: boolean
            }
        }
    }
}

export type QViewerRepoDefaultBranchGraph = {
    viewer: QRepoDefaultBranchGraph
}

export type QViewerRepoDirContentGraph = {
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
                                  byteSize: number
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
