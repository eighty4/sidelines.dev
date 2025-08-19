import { ViewerRepoExists, type ViewerRepoExistsVars } from './gql.ts'
import { queryGraphqlApi } from '../request.ts'

// checks if user authed by ghToken has a repo within its personal account
//
// this will not resolve repos from the authed user's organizations
export async function doesViewerRepoExist(
    ghToken: string,
    repo: string,
): Promise<boolean> {
    const json = await queryGraphqlApi<ViewerRepoExistsVars>(
        ghToken,
        ViewerRepoExists,
        { repo },
    )
    return !!json.data.viewer.repository
}
