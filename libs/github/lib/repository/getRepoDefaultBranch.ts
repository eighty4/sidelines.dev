import type { BranchRef, RepositoryId } from '@sidelines/model'
import { mapBranchRef } from '../_mapGraphToModel.ts'
import { queryGraphqlApi } from '../request.ts'

function repoQuery() {
    return `defaultBranchRef { name target { ... on Commit { history(first: 1) { edges { node { ... on Commit { committedDate, oid } } } } } } }`
}

export async function getRepoDefaultBranch(
    ghToken: string,
    repo: RepositoryId,
): Promise<BranchRef | 'repo-not-found'> {
    const query = `query { repository(owner: "${repo.owner}", name: "${repo.name}") { ${repoQuery()} } }`
    const json = await queryGraphqlApi(ghToken, query, null)
    return resultFromData(json.data)
}

// lookup the default branch name and its HEAD's commit object id, scoped to a user's personal repo
export async function getViewerRepoDefaultBranch(
    ghToken: string,
    repo: string,
): Promise<BranchRef | 'repo-not-found'> {
    const query = `query { viewer { repository(name: "${repo}") { ${repoQuery()} } } }`
    const json = await queryGraphqlApi(ghToken, query, null)
    return resultFromData(json.data)
}

function resultFromData(data: any): BranchRef | 'repo-not-found' {
    if (!data.repository) {
        return 'repo-not-found'
    }
    return mapBranchRef(data.repository.defaultBranchRef)
}
