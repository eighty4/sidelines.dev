import type { BranchRef } from '@sidelines/model'

export type ViewerRepoDefaultBranchGraphData = {
    viewer: RepoDefaultBranchGraphData
}

export type RepoDefaultBranchGraphData = {
    repository: {
        defaultBranchRef: {
            name: string
            target: {
                history: {
                    edges: Array<{
                        node: {
                            name: string
                            headOid: string
                            committedDate: string
                        }
                    }>
                }
            }
        }
    }
}

export function resultFromData(
    data: RepoDefaultBranchGraphData,
): BranchRef | 'repo-not-found' {
    if (!data.repository) {
        return 'repo-not-found'
    }
    const dbr = data.repository.defaultBranchRef
    const commit = dbr.target.history.edges[0].node
    return {
        name: dbr.name,
        headOid: commit.headOid,
        committedDate: new Date(commit.committedDate),
    }
}
