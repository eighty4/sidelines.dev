import type { BranchRef } from '@sidelines/model'
import { RepoNotFound, TreeObjectNotFound } from '@sidelines/model/errors'
import type { QViewerRepoDefaultBranchDirContentsGraph } from '../../graphs.ts'
import queryGraphqlApi from '../../queryGraphqlApi.ts'
import { mapBranchRef } from '../_map.ts'
import {
    QViewerRepoDefaultBranchDirContents,
    type QViewerRepoDefaultBranchDirContentsVars,
} from './gql.ts'
import { directoryObjExpr } from './objExpr.ts'

export type RepoDefaultBranchDirContents = {
    defaultBranch: BranchRef
    contents: Record<string, string>
}

// contents of all blob-type RepositoryObjects at dirpath on default branch
export async function queryViewerRepoDefaultBranchDirContents(
    ghToken: string,
    repo: string,
    dirpath: string,
): Promise<
    | RepoDefaultBranchDirContents
    | typeof RepoNotFound
    | typeof TreeObjectNotFound
> {
    const json = await queryGraphqlApi<
        QViewerRepoDefaultBranchDirContentsVars,
        QViewerRepoDefaultBranchDirContentsGraph
    >(ghToken, QViewerRepoDefaultBranchDirContents, {
        name: repo,
        objExpr: directoryObjExpr(dirpath),
    })
    const { repository } = json.data.viewer
    if (!repository) {
        return RepoNotFound
    }
    if (!repository.object) {
        return TreeObjectNotFound
    }
    const defaultBranch = mapBranchRef(repository.defaultBranchRef)
    const contents: Record<string, string> = Object.fromEntries(
        repository.object.entries
            .map(entry => {
                if (entry.type === 'blob') {
                    return [entry.name, entry.object.text]
                } else {
                    return null
                }
            })
            .filter(entry => entry !== null),
    )
    return { defaultBranch, contents }
}
