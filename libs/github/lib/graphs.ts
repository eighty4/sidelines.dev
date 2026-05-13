export type { QViewerReposNamesVars } from './repositories/gql.ts'
export type { QViewerRepoDirContentVars } from './repository/objects/gql.ts'

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
