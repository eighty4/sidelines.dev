import type { RepositoryId } from '@sidelines/model'
import type { QViewerRepoUserContextGraph } from '../graphs.ts'
import queryGraphqlApi from '../queryGraphqlApi.ts'
import {
    QViewerRepoUserContext,
    type QViewerRepoUserContextVars,
} from './gql.ts'

export type ViewerRepoUserContext = {
    login: string
    repo: {
        permissions: ViewerRepoPermissions
    } | null
}

export type ViewerRepoPermissions = {
    admin: boolean
    write: boolean
}

export async function queryViewerRepoUserContext(
    ghToken: string,
    repo: RepositoryId,
): Promise<ViewerRepoUserContext> {
    const json = await queryGraphqlApi<
        QViewerRepoUserContextVars,
        QViewerRepoUserContextGraph
    >(ghToken, QViewerRepoUserContext, {
        owner: repo.owner,
        name: repo.name,
    })
    return {
        login: json.data.viewer.login,
        repo: mapPermissions(json.data.repository),
    }
}

function mapPermissions(
    repo: QViewerRepoUserContextGraph['repository'],
): ViewerRepoUserContext['repo'] {
    if (!repo) {
        return null
    }
    switch (repo.viewerPermission) {
        case 'ADMIN':
            return {
                permissions: {
                    write: true,
                    admin: true,
                },
            }
        case 'MAINTAIN':
        case 'WRITE':
            return {
                permissions: {
                    write: true,
                    admin: false,
                },
            }
        case 'READ':
        case 'TRIAGE':
            return {
                permissions: {
                    write: false,
                    admin: false,
                },
            }
        default:
            throw Error()
    }
}
