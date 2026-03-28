import type { RepositoryId, RepositoryObject } from '@sidelines/model'
import { sortRepositoryObjects } from './_queryRepoObjects.ts'
import { QRepoDirListing, type QRepoDirListingVars } from './gql.ts'
import queryGraphqlApi from '../../queryGraphqlApi.ts'

// repo obj query where obj expr is expected to return a tree
export default async function queryRepoDirListing(
    ghToken: string,
    repo: RepositoryId,
    dirpath: string | null,
    opts?: {
        signal?: AbortSignal
    },
): Promise<Array<RepositoryObject> | 'repo-not-found'> {
    const vars = {
        ...repo,
        objExpr: dirpath === null ? `HEAD:''` : `HEAD:${dirpath}`,
    }
    const json = await queryGraphqlApi<QRepoDirListingVars, GraphData>(
        ghToken,
        QRepoDirListing,
        vars,
        opts,
    )
    if (!json.data.repository) {
        return 'repo-not-found'
    }
    if (!json.data.repository.object) {
        return []
    }
    return json.data.repository.object.entries
        .map((entry): RepositoryObject => {
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
        })
        .sort(sortRepositoryObjects)
}

type GraphData = {
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
