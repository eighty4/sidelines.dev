import { queryGraphqlApi } from '../request.ts'

export async function getUserLogin(ghToken: string): Promise<string> {
    const query = 'query { viewer { login } }'
    const json = await queryGraphqlApi(ghToken, query, null)
    return json.data.viewer.login
}
