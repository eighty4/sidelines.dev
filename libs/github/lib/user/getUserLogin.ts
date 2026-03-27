import { ViewerLogin } from './gql.ts'
import { queryGraphqlApi } from '../request.ts'

export async function getUserLogin(ghToken: string): Promise<string> {
    const json = await queryGraphqlApi<null, GraphData>(
        ghToken,
        ViewerLogin,
        null,
    )
    return json.data.viewer.login
}

type GraphData = {
    viewer: {
        login: string
    }
}
