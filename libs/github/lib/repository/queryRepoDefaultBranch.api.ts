import type { BranchRef, RepositoryId } from '@sidelines/model'
import {
    resultFromData,
    type RepoDefaultBranchGraphData,
} from './_queryRepoDefaultBranch.ts'
import { QRepoDefaultBranch, type QRepoDefaultBranchVars } from './gql.ts'
import queryGraphqlApi from '../queryGraphqlApi.ts'

export default async function queryRepoDefaultBranch(
    ghToken: string,
    repo: RepositoryId,
): Promise<BranchRef | 'repo-not-found'> {
    const json = await queryGraphqlApi<
        QRepoDefaultBranchVars,
        RepoDefaultBranchGraphData
    >(ghToken, QRepoDefaultBranch, {
        owner: repo.owner,
        name: repo.name,
    })
    return resultFromData(json.data)
}
