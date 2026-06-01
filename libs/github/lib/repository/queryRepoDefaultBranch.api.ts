import type { BranchRef, RepositoryId } from '@sidelines/model'
import { RepoNotFound } from '@sidelines/model/errors'
import type { QRepoDefaultBranchGraph } from '../graphs.ts'
import queryGraphqlApi from '../queryGraphqlApi.ts'
import { mapBranchRef } from './_map.ts'
import { QRepoDefaultBranch, type QRepoDefaultBranchVars } from './gql.ts'

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
    const { repository } = json.data
    if (!repository) {
        return RepoNotFound
    }
    return mapBranchRef(repository.defaultBranchRef)
}
