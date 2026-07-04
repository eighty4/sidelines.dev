import type { BranchRef } from '@sidelines/model'
import type { MRepoDefaultBranch } from '../graphs.ts'

export function mapBranchRef(defaultBranch: MRepoDefaultBranch): BranchRef {
    const commit = defaultBranch.target.history.edges[0].node
    return {
        name: defaultBranch.name,
        headOid: commit.oid,
    }
}
