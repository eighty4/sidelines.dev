import type { RepositoryId, RepositoryObject } from '@sidelines/model'
import { queryGraphqlApi } from '../../request.ts'
import { sortRepositoryObjects } from '../../responses.ts'

export async function getRepoDirListing(
    ghToken: string | null,
    repo: RepositoryId,
    dirpath: string | null,
): Promise<Array<RepositoryObject> | 'repo-not-found'> {
    dirpath = dirpath || ''
    const query = `query {
    repository(owner: "${repo.owner}", name: "${repo.name}") {
      object(expression: "HEAD:${dirpath || ''}") {
        ... on Tree {
          entries {
            name
            type
            object {
              ... on Blob {
                byteSize
              }
            }
          }
        }
      }
    }
  }`
    const json = await queryGraphqlApi(ghToken, query, null)
    if (!json.data.repository) {
        return 'repo-not-found'
    }
    if (!json.data.repository.object) {
        return []
    }
    return json.data.repository.object.entries
        .map(
            (
                entry:
                    | { name: string; type: 'tree' }
                    | {
                          name: string
                          type: 'blob'
                          object: { byteSize: number }
                      },
            ): RepositoryObject => {
                switch (entry.type) {
                    case 'blob':
                        return {
                            type: 'file-ls',
                            name: entry.name,
                            size: entry.object.byteSize,
                        }
                    case 'tree':
                        return { type: 'dir', name: entry.name }
                    default:
                        throw new Error(
                            `what is repository object ${JSON.stringify(entry)}?`,
                        )
                }
            },
        )
        .sort(sortRepositoryObjects)
}
