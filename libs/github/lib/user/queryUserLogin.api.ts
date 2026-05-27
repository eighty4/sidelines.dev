import queryGraphqlApi from '../queryGraphqlApi.ts'
import { QViewerLogin } from './gql.ts'

export async function queryUserLogin(ghToken: string): Promise<string> {
    const json = await queryGraphqlApi<null, GraphData>(
        ghToken,
        QViewerLogin,
        null,
    )
    return json.data.viewer.login
}

type GraphData = {
    viewer: {
        login: string
    }
}
