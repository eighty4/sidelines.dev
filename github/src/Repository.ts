import { onUnauthorized, type Pageable } from './responses.ts'

// graphql mutation createCommitOnBranch requires a pre-existing ref
// so we use a template repo to seed a commit at refs/head/main
//
// generating from template does not allow setting homepage url
// so we update that after generating from template
//  homepage url is used to check the gh user's .sidelines repo
//  before any mutations to ensure its meant for sidelines.dev
export async function createNotesRepo(
    ghToken: string,
    owner: string,
    repo?: string,
) {
    await generateNotesRepoFromTemplate(ghToken)
    await updateNotesRepoHomepage(ghToken, owner)
    if (repo) {
        await new Promise(res => setTimeout(res, 500))
        await createCommitOnBranch({
            ghToken,
            owner,
            repo: '.sidelines',
            commitMessage: `add ${owner}/${repo} notes README.md`,
            branch: await getRepoDefaultBranch(ghToken, '.sidelines'),
            additions: [
                {
                    path: repo + '/README.md',
                    contents: btoa(`# ${owner}/${repo} notes`),
                },
            ],
        })
    }
}

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

async function updateNotesRepoHomepage(
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

// variation of doesRepoExist that looks for a user's .sidelines repo
//
// returns 'misconfigured' if homepageUrl !== 'https://sidelines.dev'
// returns 'project-readme-missing' if repo param provided and .sidelines is missing a ${repo}/README.md file
export async function doesNotesRepoExist(
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

// checks if user authed by ghToken has a repo within its personal account
//
// this will not resolve repos from the authed user's organizations
export async function doesRepoExist(
    ghToken: string,
    repo: string,
): Promise<boolean> {
    const query = `query { viewer { repository(name: "${repo}") { nameWithOwner } } }`
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + ghToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    })
    if (response.status === 401) {
        onUnauthorized()
    }
    const json = await response.json()
    return !!json.data.viewer.repository
}

export interface CreateCommitOnBranchInput {
    ghToken: string
    owner: string
    repo: string
    commitMessage: string
    branch: { name: string; headOid: string }
    additions?: Array<{ path: string; contents: string }>
    deletions?: Array<{ path: string }>
}

// https://docs.github.com/en/graphql/reference/mutations#createcommitonbranch
export async function createCommitOnBranch({
    ghToken,
    owner,
    repo,
    commitMessage,
    branch,
    additions,
    deletions,
}: CreateCommitOnBranchInput): Promise<void> {
    const query = `
    mutation {
      createCommitOnBranch(input: {
        branch: {
          repositoryNameWithOwner: "${owner}/${repo}",
          branchName: "${branch.name}"
        },
        message: {
          headline: "${commitMessage}"
        },
        expectedHeadOid: "${branch.headOid}",
        fileChanges: {
          ${additions?.length ? 'additions: [' + additions.map(addition => `{path: "${addition.path}", contents: "${addition.contents}"}`) + ']' : ''}
          ${deletions?.length ? 'deletions: [' + deletions.map(deletion => `{path: "${deletion.path}"}`) + ']' : ''}
        }
      }) {
      commit {
        oid
        url
      }
    }
  }`
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + ghToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    })
    if (response.status === 401) {
        onUnauthorized()
    }
    if (response.status !== 200) {
        console.error(await response.text())
        throw new Error('graphql http error')
    }
    const json = await response.json()
    if (json.errors) {
        throw new Error(
            'graphql mutation createCommitOnBranch error:\n' +
                JSON.stringify(json, null, 4),
        )
    }
}

// lookup the default branch name and its HEAD's commit object id, scoped to a user's personal repo
export async function getRepoDefaultBranch(
    ghToken: string,
    repo: string,
): Promise<{ name: string; headOid: string }> {
    const query = `query {
    viewer {
      repository(name: "${repo}") {
        defaultBranchRef {
          name
          target {
            ... on Commit {
              history(first: 1) { edges { node { ... on Commit { oid } } } }
            }
          }
        }
      }
    }
  }`
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + ghToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    })
    if (response.status === 401) {
        onUnauthorized()
    }
    const json = await response.json()
    const name = json.data.viewer.repository.defaultBranchRef.name
    const headOid =
        json.data.viewer.repository.defaultBranchRef.target.history.edges[0]
            .node.oid
    return { name, headOid }
}

export type RepoContent =
    | {
          type: 'dir'
          name: string
      }
    | {
          type: 'file'
          name: string
          size: number
      }

export async function getRepoDirListing(
    ghToken: string,
    repo: string,
    dirpath: string,
): Promise<Array<RepoContent> | 'repo-does-not-exist'> {
    const query = `query {
    viewer {
      repository(name: "${repo}") {
        object(expression: "HEAD:${dirpath}") {
          ... on Tree {
            entries {
              name
              type
              object {
                ... on Blob {
                  byteSize
                }
              }
            }
          }
        }
      }
    }
  }`
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + ghToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    })
    if (response.status === 401) {
        onUnauthorized()
    }
    const json = await response.json()
    if (!json.data.viewer.repository) {
        return 'repo-does-not-exist'
    }
    if (!json.data.viewer.repository.object) {
        return []
    }
    return json.data.viewer.repository.object.entries
        .map(
            (
                entry:
                    | { name: string; type: 'tree' }
                    | {
                          name: string
                          type: 'blob'
                          object: { byteSize: number }
                      },
            ): RepoContent => {
                switch (entry.type) {
                    case 'blob':
                        return {
                            type: 'file',
                            name: entry.name,
                            size: entry.object.byteSize,
                        }
                    case 'tree':
                        return { type: 'dir', name: entry.name }
                    default:
                        throw new Error(
                            `what is repository object ${JSON.stringify(entry)}?`,
                        )
                }
            },
        )
        .sort(sortRepoContents)
}

// cat of file at a given path in a repository, scoped to a user's personal repos
export async function getRepoContent(
    ghToken: string,
    repo: string,
    path: string,
): Promise<string | null> {
    const query = `query {
    viewer {
      repository(name: "${repo}") {
        object(expression: "HEAD:${path}") {
          ... on Blob {
            text
          }
        }
      }
    }
  }`
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + ghToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    })
    if (response.status === 401) {
        onUnauthorized()
    }
    const json = await response.json()
    return json.data.viewer.repository?.object?.text || null
}

export interface SearchRepoNamesResult {
    term: string
    matches: Array<string>
}

export async function searchRepoNames(
    ghToken: string,
    owner: string,
    term: string,
): Promise<SearchRepoNamesResult> {
    const query = `{ search(query: "user:${owner} in:name ${term}", type: REPOSITORY, first: 5) { nodes { ... on Repository { name }}}}`
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + ghToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    })
    if (response.status === 401) {
        onUnauthorized()
    }
    const json = await response.json()
    return {
        term,
        matches: json.data.search.nodes.length
            ? json.data.search.nodes.map(
                  (datum: { name: string }) => datum.name,
              )
            : [],
    }
}

// sorts dirs on filename a-z, then files on filename a-z
function sortRepoContents(rc1: RepoContent, rc2: RepoContent): -1 | 0 | 1 {
    if (rc1.type === rc2.type) {
        const rc1n = rc1.name.toUpperCase()
        const rc2n = rc2.name.toUpperCase()
        if (rc1n === rc2n) {
            return 0
        } else if (rc1n < rc2n) {
            return -1
        } else {
            return 1
        }
    }
    return rc1.type === 'dir' ? -1 : 1
}

export type ObjectHistory = {
    oid: string
    authorName: string
    message: string
    authoredDate: string
}

export async function getObjectHistory(
    ghToken: string,
    repo: string,
    branch: string,
    path: string,
    pageSize: number,
    cursor?: string,
): Promise<Pageable<ObjectHistory>> {
    const query = `{
      viewer {
        repository(name: "${repo}") {
          ref(qualifiedName: "${branch}") {
            target {
              ... on Commit {
                history(first:${pageSize}, path: "${path}", after: ${!!cursor ? `"${cursor}"` : 'null'}) {
                  nodes {
                    oid
                    author {
                      name
                    }
                    message
                    authoredDate
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  totalCount
                }
              }
            }
          }
        }
      }
    }`
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + ghToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    })
    if (response.status === 401) {
        onUnauthorized()
    }
    const json = await response.json()
    if (!json.data.viewer.repository?.ref?.target?.history) {
        throw new Error(
            `repo ${repo} branch ${branch} path ${path} object history not found`,
        )
    }
    const { nodes, totalCount, pageInfo } =
        json.data.viewer.repository.ref.target.history
    return {
        totalCount,
        pageInfo: {
            hasNextPage: pageInfo.hasNextPage,
            endCursor: pageInfo.endCursor,
        },
        data: nodes.map((node: any) => {
            return {
                oid: node.oid,
                authorName: node.author.name,
                message: node.message,
                authoredDate: node.authoredDate,
            }
        }),
    }
}
