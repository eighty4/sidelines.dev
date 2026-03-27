import type { RepositoryId } from '@sidelines/model'
import { queryGraphqlApi } from '../../request.ts'

// cat of file at a given path in a repository
export async function getRepoObjectContent(
    ghToken: string,
    repo: RepositoryId,
    path: string,
): Promise<string | null> {
    const query = `query {
      repository(owner: "${repo.owner}", name: "${repo.name}") {
        object(expression: "HEAD:${path}") {
          ... on Blob {
            text
          }
        }
      }
  }`
    const json = await queryGraphqlApi<null, GraphData>(ghToken, query, null)
    return json.data.repository?.object?.text || null
}

type GraphData = {
    repository: null | {
        object: null | {
            text: string
        }
    }
}
