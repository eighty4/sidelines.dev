import type { RepositoryId } from '@sidelines/model'
import { mapObject } from './_queryRepoObjects.ts'
import { QRepoObject, type QRepoObjectVars } from './gql.ts'
import type { RepoObject } from './types.api.ts'
import queryGraphqlApi from '../../queryGraphqlApi.ts'

// repo obj query where obj expr is expected to return a blob or tree
export default async function queryRepoObject(
    ghToken: string,
    repo: RepositoryId,
    path: string | null,
    opts?: {
        signal?: AbortSignal
    },
): Promise<RepoObject | 'repo-not-found'> {
    path = path || ''
    const json = await queryGraphqlApi<QRepoObjectVars, any>(
        ghToken,
        QRepoObject,
        { owner: repo.owner, name: repo.name, objExpr: `HEAD:${path || ''}` },
        opts,
    )
    if (!json.data.repository) {
        return 'repo-not-found'
    }
    return mapObject(path, json.data.repository.object)
}
