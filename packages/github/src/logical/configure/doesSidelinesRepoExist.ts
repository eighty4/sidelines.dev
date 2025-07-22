import { onUnauthorized } from '../../responses.ts'

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
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + ghToken,
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ query }),
    })
    if (response.status === 401) {
        onUnauthorized()
    }
    const json = await response.json()
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
