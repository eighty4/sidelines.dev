import {
    createCommitOnBranch,
    getViewerRepoDefaultBranch,
    type RepoBranchReference,
} from '../../index.ts'
import { restPostForJson, restPostForResponse } from '../../request.ts'

// graphql mutation createCommitOnBranch requires a pre-existing ref
// so we use a template repo to seed a commit at refs/head/main
//
// generating from template does not allow setting homepage url
// so we update that after generating from template
//  homepage url is used to check the gh user's .sidelines repo
//  before any mutations to ensure its meant for sidelines.dev
export async function createSidelinesRepo(
    ghToken: string,
    owner: string,
    repo?: string,
) {
    await generateNotesRepoFromTemplate(ghToken)
    await updateSidelinesRepoHomepage(ghToken, owner)
    if (repo) {
        const branch = await pollForDefaultBranchAfterCreatingRepo(
            ghToken,
            '.sidelines',
        )
        await createCommitOnBranch({
            ghToken,
            owner,
            repo: '.sidelines',
            commitMessage: `add ${owner}/${repo} notes README.md`,
            branch,
            additions: [
                {
                    path: `${repo}/README.md`,
                    contents: btoa(`# ${owner}/${repo}`),
                },
            ],
        })
    }
}

async function generateNotesRepoFromTemplate(ghToken: string): Promise<void> {
    const response = await restPostForResponse(
        ghToken,
        'https://api.github.com/repos/eighty4/.sidelines.template/generate',
        {
            name: '.sidelines',
            description: 'Note taking on Sidelines.dev',
            private: true,
        },
    )
    if (response.status !== 201) {
        console.error(await response.text())
        throw new Error(
            'generate notes repo from template failed with ' + response.status,
        )
    }
}

async function pollForDefaultBranchAfterCreatingRepo(
    ghToken: string,
    repo: string,
): Promise<RepoBranchReference> {
    const DELAY_MS = 200
    const INTERVAL_MS = 50
    const TIMEOUT_MS = 5000
    await new Promise(res => setTimeout(res, DELAY_MS))
    const timeout: Promise<'timeout'> = new Promise(res =>
        setTimeout(() => res('timeout'), TIMEOUT_MS),
    )
    let fetching: Promise<RepoBranchReference | 'repo-not-found'>
    while (true) {
        fetching = getViewerRepoDefaultBranch(ghToken, repo)
        let branch: 'timeout' | RepoBranchReference | 'repo-not-found'
        branch = await Promise.race([timeout, fetching])
        if (branch === 'timeout') {
            throw Error('timed out')
        } else if (branch === 'repo-not-found') {
            await new Promise(res => setTimeout(res, INTERVAL_MS))
        } else {
            return branch
        }
    }
}

async function updateSidelinesRepoHomepage(
    ghToken: string,
    owner: string,
): Promise<void> {
    await restPostForJson(
        ghToken,
        `https://api.github.com/repos/${owner}/.sidelines`,
        {
            homepage: 'https://sidelines.dev',
        },
    )
}
