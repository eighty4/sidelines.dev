import type { BranchRef } from '@sidelines/model'
import { RepoNotFound } from '@sidelines/model/errors'
import type { QRepoDefaultBranchGraph } from '../graphs.ts'

export function mapBranchRef(
    data: QRepoDefaultBranchGraph,
): BranchRef | typeof RepoNotFound {
    if (!data.repository) {
        return RepoNotFound
    }
    const dbr = data.repository.defaultBranchRef
    const commit = dbr.target.history.edges[0].node
    return {
        name: dbr.name,
        headOid: commit.oid,
        committedDate: new Date(commit.committedDate),
    }
}
