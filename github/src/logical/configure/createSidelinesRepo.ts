import {
    createCommitOnBranch,
    getRepoDefaultBranch,
} from '../../operations/Repository.ts'
import { NotFoundError, onUnauthorized } from '../../responses.ts'

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

// todo if reusable reorg as API operation
async function generateNotesRepoFromTemplate(ghToken: string): Promise<void> {
    const url =
        'https://api.github.com/repos/eighty4/.sidelines.template/generate'
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: 'Bearer ' + ghToken,
            'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
            name: '.sidelines',
            description: 'Note taking on Sidelines.dev',
            private: true,
        }),
    })
    if (response.status === 401) {
        onUnauthorized()
    }
    if (response.status !== 201) {
        console.error(await response.text())
        throw new Error(
            'generate notes repo from template failed with ' + response.status,
        )
    }
}

// todo eval if REST API has more immediate availability and could skip polling logic
async function pollForDefaultBranchAfterCreatingRepo(
    ghToken: string,
    repo: string,
): Promise<{ name: string; headOid: string }> {
    const DELAY_MS = 200
    const INTERVAL_MS = 50
    const TIMEOUT_MS = 5000
    await new Promise(res => setTimeout(res, DELAY_MS))
    const timeout: Promise<'timeout'> = new Promise(res =>
        setTimeout(() => res('timeout'), TIMEOUT_MS),
    )
    let fetching: Promise<{ name: string; headOid: string }>
    while (true) {
        fetching = getRepoDefaultBranch(ghToken, repo)
        try {
            let branch: 'timeout' | { name: string; headOid: string }
            branch = await Promise.race([timeout, fetching])
            if (branch === 'timeout') {
                throw new Error('timed out')
            } else {
                return branch
            }
        } catch (e) {
            if (e instanceof NotFoundError) {
                await new Promise(res => setTimeout(res, INTERVAL_MS))
                continue
            } else {
                throw e
            }
        }
    }
}

// todo if reusable reorg as API operation
async function updateSidelinesRepoHomepage(
    ghToken: string,
    owner: string,
): Promise<void> {
    const response = await fetch(
        `https://api.github.com/repos/${owner}/.sidelines`,
        {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + ghToken,
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
            body: JSON.stringify({
                homepage: 'https://sidelines.dev',
            }),
        },
    )
    if (response.status === 401) {
        onUnauthorized()
    }
    if (response.status !== 200) {
        console.error(await response.text())
        throw new Error(
            'update notes repo homepage failed with ' + response.status,
        )
    }
}
