import type { MRepoDefaultBranch } from '../graphs.ts'

export function mapBranchRef(defaultBranch: MRepoDefaultBranch) {
    const commit = defaultBranch.target.history.edges[0].node
    return {
        name: defaultBranch.name,
        headOid: commit.oid,
        committedDate: new Date(commit.committedDate),
    }
}
