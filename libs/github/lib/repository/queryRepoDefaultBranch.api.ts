import type { BranchRef, RepositoryId } from '@sidelines/model'
import { mapBranchRef } from './_map.ts'
import { QRepoDefaultBranch, type QRepoDefaultBranchVars } from './gql.ts'
import type { QRepoDefaultBranchGraph } from '../graphs.ts'
import queryGraphqlApi from '../queryGraphqlApi.ts'
import type { RepoNotFound } from '@sidelines/model/errors'

export default async function queryRepoDefaultBranch(
    ghToken: string,
    repo: RepositoryId,
): Promise<BranchRef | typeof RepoNotFound> {
    const json = await queryGraphqlApi<
        QRepoDefaultBranchVars,
        QRepoDefaultBranchGraph
    >(ghToken, QRepoDefaultBranch, {
        owner: repo.owner,
        name: repo.name,
    })
    return mapBranchRef(json.data)
}
