import type { BranchRef } from '@sidelines/model'
import type { RepoNotFound } from '@sidelines/model/errors'
import { mapBranchRef } from './_map.ts'
import {
    QViewerRepoDefaultBranch,
    type QViewerRepoDefaultBranchVars,
} from './gql.ts'
import type { QViewerRepoDefaultBranchGraph } from '../graphs.ts'
import queryGraphqlApi from '../queryGraphqlApi.ts'

// lookup the default branch name and its HEAD's commit object id, scoped to a user's personal repo
export default async function queryViewerRepoDefaultBranch(
    ghToken: string,
    repo: string,
): Promise<BranchRef | typeof RepoNotFound> {
    const json = await queryGraphqlApi<
        QViewerRepoDefaultBranchVars,
        QViewerRepoDefaultBranchGraph
    >(ghToken, QViewerRepoDefaultBranch, { repo })
    return mapBranchRef(json.data.viewer)
}
