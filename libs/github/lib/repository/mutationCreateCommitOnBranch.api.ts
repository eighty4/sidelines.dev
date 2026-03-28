import type { RepositoryId } from '@sidelines/model'
import queryGraphqlApi from '../queryGraphqlApi.ts'

export type CreateCommitInputs = {
    repo: RepositoryId
    commitMessage: string
    branch: { name: string; headOid: string }
    additions?: Array<CommitRepoAddition>
    deletions?: Array<CommitRepoDeletion>
}

export type CommitRepoAddition = {
    dirpath: string
    filename: string
    content: string
}

export type CommitRepoDeletion = {
    dirpath: string
    filename: string
}

function toCommitPath(change: CommitRepoAddition | CommitRepoDeletion): string {
    return `${change.dirpath}/${change.filename}`
}

// https://docs.github.com/en/graphql/reference/mutations#createcommitonbranch
export async function createCommitOnBranch(
    ghToken: string,
    { repo, commitMessage, branch, additions, deletions }: CreateCommitInputs,
): Promise<void> {
    const query = `
    mutation {
      createCommitOnBranch(input: {
        branch: {
          repositoryNameWithOwner: "${repo.owner}/${repo.name}",
          branchName: "${branch.name}"
        },
        message: {
          headline: "${commitMessage}"
        },
        expectedHeadOid: "${branch.headOid}",
        fileChanges: {
          ${additions?.length ? 'additions: [' + additions.map(addition => `{path: "${toCommitPath(addition)}", contents: "${addition.content}"}`) + ']' : ''}
          ${deletions?.length ? 'deletions: [' + deletions.map(deletion => `{path: "${toCommitPath(deletion)}"}`) + ']' : ''}
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
