import { ViewerLogin } from './gql.ts'
import { queryGraphqlApi } from '../request.ts'

export async function getUserLogin(ghToken: string): Promise<string> {
    const json = await queryGraphqlApi(ghToken, ViewerLogin, null)
    return json.data.viewer.login
}
