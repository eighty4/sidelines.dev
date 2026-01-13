import type { BranchRef } from '@sidelines/model'

export function mapBranchRef(branchRef: any): BranchRef {
    const commit = branchRef.target.history.edges[0].node
    return {
        name: branchRef.name,
        headOid: commit.oid,
        committedDate: new Date(commit.committedDate),
    }
}
