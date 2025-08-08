import { queryGraphqlApi } from '../request.ts'

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
    const json = await queryGraphqlApi(ghToken, query, null)
    if (json.errors) {
        throw new Error(
            'graphql mutation createCommitOnBranch error:\n' +
                JSON.stringify(json, null, 4),
        )
    }
}
