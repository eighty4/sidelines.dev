import type { RepositoryObject } from '@sidelines/model'
import { ViewerRepoDirContent, type ViewerRepoDirContentVars } from './gql.ts'
import { queryGraphqlApi } from '../../request.ts'
import { sortRepositoryObjects } from '../../responses.ts'

// repo obj query where obj expr is expected to return a tree
// and retrieves text of blob entries at that path
export async function getViewerRepoDirContent(
    ghToken: string,
    repo: string,
    dirpath: string,
    ref: string = 'HEAD',
): Promise<Array<RepositoryObject> | 'repo-does-not-exist'> {
    const json = await queryGraphqlApi<ViewerRepoDirContentVars, GraphData>(
        ghToken,
        ViewerRepoDirContent,
        {
            name: repo,
            objExpr: `${ref}:${dirpath.length ? dirpath : `''`}`,
        },
    )
    if (!json.data.viewer.repository) {
        return 'repo-does-not-exist'
    }
    if (!json.data.viewer.repository.object) {
        return []
    }
    return json.data.viewer.repository.object.entries
        .map((entry): RepositoryObject => {
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
        })
        .sort(sortRepositoryObjects)
}

type GraphData = {
    viewer: {
        repository: {
            object: {
                entries: Array<
                    {
                        name: string
                    } & (
                        | {
                              type: 'blob'
                              object: {
                                  byteSize: number
                                  text: string
                              }
                          }
                        | {
                              type: 'tree'
                          }
                    )
                >
            }
        }
    }
}
