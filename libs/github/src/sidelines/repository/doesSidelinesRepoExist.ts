import { queryGraphqlApi } from '../../request.ts'

// variation of doesRepoExist that looks for a user's .sidelines repo
//
// returns 'misconfigured' if homepageUrl !== 'https://sidelines.dev'
// returns 'project-readme-missing' if repo param provided and .sidelines is missing a ${repo}/README.md file
export async function doesSidelinesRepoExist(
    ghToken: string,
    repo?: string,
): Promise<boolean | 'misconfigured' | 'project-readme-missing'> {
    const query = `query { viewer { repository(name: ".sidelines") {
      homepageUrl
      nameWithOwner
      ${!repo ? '' : `object(expression: "HEAD:${repo}/README.md"){ abbreviatedOid }`}
    } } }`
    const json = await queryGraphqlApi(ghToken, query, null)
    if (!json.data.viewer.repository) {
        return false
    } else if (
        json.data.viewer.repository.homepageUrl !== 'https://sidelines.dev'
    ) {
        return 'misconfigured'
    } else if (!!repo && json.data.viewer.repository.object === null) {
        return 'project-readme-missing'
    } else {
        return true
    }
}
