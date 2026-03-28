import type { BranchRef } from '@sidelines/model'
import {
    resultFromData,
    type ViewerRepoDefaultBranchGraphData,
} from './_queryRepoDefaultBranch.ts'
import {
    QViewerRepoDefaultBranch,
    type QViewerRepoDefaultBranchVars,
} from './gql.ts'
import queryGraphqlApi from '../queryGraphqlApi.ts'

// lookup the default branch name and its HEAD's commit object id, scoped to a user's personal repo
export default async function queryViewerRepoDefaultBranch(
    ghToken: string,
    repo: string,
): Promise<BranchRef | 'repo-not-found'> {
    const json = await queryGraphqlApi<
        QViewerRepoDefaultBranchVars,
        ViewerRepoDefaultBranchGraphData
    >(ghToken, QViewerRepoDefaultBranch, { repo })
    return resultFromData(json.data.viewer)
}
