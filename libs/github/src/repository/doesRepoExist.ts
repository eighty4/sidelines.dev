import { queryGraphqlApi } from '../request.ts'

// checks if user authed by ghToken has a repo within its personal account
//
// this will not resolve repos from the authed user's organizations
export async function doesRepoExist(
    ghToken: string,
    repo: string,
): Promise<boolean> {
    const query = `query { viewer { repository(name: "${repo}") { nameWithOwner } } }`
    const json = await queryGraphqlApi(ghToken, query, null)
    return !!json.data.viewer.repository
}
