import { CheckSidelinesRepo } from './gql.ts'
import { queryGraphqlApi } from '../../request.ts'

export type SidelinesRepoProblem = 'bad-url' | 'not-private'

// checks integrity of a user's .sidelines repo
//
// returns true if good, false if it does not exist
// returns a set with `bad-url` and `not-private` if those misconfigurations are found
export async function checkSidelinesRepo(
    ghToken: string,
): Promise<boolean | Set<SidelinesRepoProblem>> {
    const json = await queryGraphqlApi(ghToken, CheckSidelinesRepo, null)
    if (!json.data.viewer.repository) {
        return false
    }
    const GREAT_URL = 'https://sidelines.dev'
    const { homepageUrl, isPrivate } = json.data.viewer.repository
    if (homepageUrl === GREAT_URL && isPrivate) {
        return true
    }
    const problems = new Set<SidelinesRepoProblem>()
    if (homepageUrl !== GREAT_URL) problems.add('bad-url')
    if (!isPrivate) problems.add('not-private')
    return problems
}
