import { RepoNotFound, TreeObjectNotFound } from '@sidelines/model/errors'
import type { QViewerRepoDirContentsGraph } from '../../graphs.ts'
import queryGraphqlApi from '../../queryGraphqlApi.ts'
import {
    QViewerRepoDirContents,
    type QViewerRepoDirContentsVars,
} from './gql.ts'

export type RepoDirContents = {
    contents: Record<string, string>
}

// contents of all blob-type RepositoryObjects at dirpath
export async function queryViewerRepoDirContents(
    ghToken: string,
    repo: string,
    dirpath: string,
    ref: string = 'HEAD',
): Promise<RepoDirContents | typeof RepoNotFound | typeof TreeObjectNotFound> {
    const json = await queryGraphqlApi<
        QViewerRepoDirContentsVars,
        QViewerRepoDirContentsGraph
    >(ghToken, QViewerRepoDirContents, {
        name: repo,
        objExpr: `${ref}:${dirpath.length ? dirpath : `''`}`,
    })
    if (!json.data.viewer.repository) {
        return RepoNotFound
    }
    if (!json.data.viewer.repository.object) {
        return TreeObjectNotFound
    }
    const contents: Record<string, string> = Object.fromEntries(
        json.data.viewer.repository.object.entries
            .map(entry => {
                if (entry.type === 'blob') {
                    return [entry.name, entry.object.text]
                } else {
                    return null
                }
            })
            .filter(entry => entry !== null),
    )
    return { contents }
}
