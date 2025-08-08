import type { RepositoryObject } from '@sidelines/model'
import { queryGraphqlApi } from '../../request.ts'
import { sortRepositoryObjects } from '../../responses.ts'

export async function getRepoDirContent(
    ghToken: string,
    repo: string,
    dirpath: string,
    ref: string = 'HEAD',
): Promise<Array<RepositoryObject> | 'repo-does-not-exist'> {
    const query = `query {
    viewer {
      repository(name: "${repo}") {
        object(expression: "${ref}:${dirpath}") {
          ... on Tree {
            entries {
              name
              type
              object {
                ... on Blob {
                  byteSize
                  text
                }
              }
            }
          }
        }
      }
    }
  }`
    const json = await queryGraphqlApi(ghToken, query, null)
    if (!json.data.viewer.repository) {
        return 'repo-does-not-exist'
    }
    if (!json.data.viewer.repository.object) {
        return []
    }
    return json.data.viewer.repository.object.entries
        .map(
            (
                entry:
                    | { name: string; type: 'tree' }
                    | {
                          name: string
                          type: 'blob'
                          object: { byteSize: number; text: string }
                      },
            ): RepositoryObject => {
                switch (entry.type) {
                    case 'blob':
                        return {
                            type: 'file-cat',
                            name: entry.name,
                            size: entry.object.byteSize,
                            content: entry.object.text,
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
