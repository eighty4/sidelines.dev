import type { RepositoryId } from '@sidelines/model'
import { mapRepoObject } from './_map.ts'
import { QRepoObject, type QRepoObjectVars } from './gql.ts'
import type { RepoObject } from './types.api.ts'
import queryGraphqlApi from '../../queryGraphqlApi.ts'
import type { QRepoObjectGraph } from '../../graphs.ts'

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
    const json = await queryGraphqlApi<QRepoObjectVars, QRepoObjectGraph>(
        ghToken,
        QRepoObject,
        { owner: repo.owner, name: repo.name, objExpr: `HEAD:${path || ''}` },
        opts,
    )
    if (!json.data.repository) {
        return 'repo-not-found'
    }
    return mapRepoObject(path, json.data.repository.object)
}
