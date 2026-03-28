import { QViewerRepoExists, type QViewerRepoExistsVars } from './gql.ts'
import queryGraphqlApi from '../queryGraphqlApi.ts'

// checks if user authed by ghToken has a repo within its personal account
//
// this will not resolve repos from the authed user's organizations
export async function queryDoesViewerRepoExist(
    ghToken: string,
    repo: string,
): Promise<boolean> {
    const json = await queryGraphqlApi<QViewerRepoExistsVars, GraphData>(
        ghToken,
        QViewerRepoExists,
        { repo },
    )
    return !!json.data.viewer.repository
}

type GraphData = {
    viewer: {
        repository: { nameWithOwner: string } | null
    }
}
