import type { RepositoryId } from '@sidelines/model'
import { QRepoObjectContent, type QRepoObjectContentVars } from './gql.ts'
import queryGraphqlApi from '../../queryGraphqlApi.ts'

// cat of file at a given path in a repository
export default async function queryRepoObjectContent(
    ghToken: string,
    repo: RepositoryId,
    path: string,
): Promise<string | null> {
    const json = await queryGraphqlApi<QRepoObjectContentVars, GraphData>(
        ghToken,
        QRepoObjectContent,
        {
            owner: repo.owner,
            name: repo.name,
            objExpr: `HEAD:${path}`,
        },
    )
    return json.data.repository?.object?.text || null
}

type GraphData = {
    repository: null | {
        object: null | {
            text: string
        }
    }
}
