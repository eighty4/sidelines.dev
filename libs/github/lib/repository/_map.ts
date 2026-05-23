import type { BranchRef } from '@sidelines/model'
import type { QRepoDefaultBranchGraph } from '../graphs.ts'

export function mapBranchRef(
    data: QRepoDefaultBranchGraph,
): BranchRef | 'repo-not-found' {
    if (!data.repository) {
        return 'repo-not-found'
    }
    const dbr = data.repository.defaultBranchRef
    const commit = dbr.target.history.edges[0].node
    return {
        name: dbr.name,
        headOid: commit.oid,
        committedDate: new Date(commit.committedDate),
    }
}
