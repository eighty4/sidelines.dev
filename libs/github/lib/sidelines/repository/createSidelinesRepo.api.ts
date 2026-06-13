import restPostForResponse from '../../restPostForResponse.ts'

// creates the .sidelines repo for user notes
// repo will always be validated for intentional use & integrity
// by checking repo homepage url is "https://sidelines.dev"
// and repo visibility is private to user
//
// graphql mutation createCommitOnBranch requires a pre-existing ref
// so we use `auto_init=true` to seed a commit at refs/head/main
// and the graphql mutation will be able to create commits
export default async function createSidelinesRepo(ghToken: string) {
    const response = await restPostForResponse(
        ghToken,
        'https://api.github.com/user/repos',
        {
            name: '.sidelines',
            description: 'Notes on Sidelines.dev',
            homepage: 'https://sidelines.dev',
            auto_init: true,
            private: true,
            has_issues: false,
            has_projects: false,
            has_wiki: false,
            has_discussions: false,
        },
    )
    if (response.status !== 201) {
        console.error(await response.text())
        throw Error(`create .sidelines repo got ${response.status}`)
    }
}
