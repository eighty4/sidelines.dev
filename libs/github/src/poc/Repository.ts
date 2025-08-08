// @ts-nocheck

import type { RepositoryId, RepositoryObject } from '@sidelines/model'
import {
    RepoDirContent,
    RepoDirListing,
    RepoObjectContent,
} from './gql/repos.ts'
import type {
    RepoDirContentVariables,
    RepoDirListingVariables,
    RepoObjectContentVariables,
} from './vars/repos.ts'
import { queryGraphqlApi } from '../request.ts'
import { sortRepositoryObjects } from '../responses.ts'

export async function getRepoDirListing(
    ghToken: string | null,
    repo: RepositoryId,
    dirpath: string | null,
): Promise<Array<RepositoryObject> | 'repo-not-found'> {
    dirpath = dirpath || ''
    const json = await queryGraphqlApi<RepoDirListingVariables>(
        ghToken,
        RepoDirListing,
        { ...repo, objExpr: 'HEAD:' + dirpath },
    )
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

export async function getRepoDirContent(
    ghToken: string,
    repo: RepositoryId,
    dirpath: string,
    ref: string = 'HEAD',
): Promise<Array<RepositoryObject> | 'repo-does-not-exist'> {
    const json = await queryGraphqlApi<RepoDirContentVariables>(
        ghToken,
        RepoDirContent,
        { ...repo, objExpr: `${ref}:${dirpath}` },
    )
    if (!json.data.repository) {
        return 'repo-does-not-exist'
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

// cat of file at a given path in a repository
export async function getRepoObjectContent(
    ghToken: string | null,
    repo: RepositoryId,
    path: string,
): Promise<string | null> {
    const json = await queryGraphqlApi<RepoObjectContentVariables>(
        ghToken,
        RepoObjectContent,
        { ...repo, objExpr: 'HEAD:' + path },
    )
    return json.data.repository?.object?.text || null
}
