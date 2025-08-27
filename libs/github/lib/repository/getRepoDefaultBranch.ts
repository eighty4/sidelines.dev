import type { RepositoryId } from '@sidelines/model'
import { queryGraphqlApi } from '../request.ts'

export type RepoBranchReference = {
    committedDate: Date
    headOid: string
    name: string
}

function resultFromData(data: any): RepoBranchReference | 'repo-not-found' {
    if (!data.repository) {
        return 'repo-not-found'
    }
    const name = data.repository.defaultBranchRef.name
    const headOid =
        data.repository.defaultBranchRef.target.history.edges[0].node.oid
    const committedDate = new Date(
        data.repository.defaultBranchRef.target.history.edges[0].node.committedDate,
    )
    return { committedDate, headOid, name }
}

function repoQuery() {
    return `defaultBranchRef { name target { ... on Commit { history(first: 1) { edges { node { ... on Commit { committedDate, oid } } } } } } }`
}

export async function getRepoDefaultBranch(
    ghToken: string | null,
    repo: RepositoryId,
): Promise<RepoBranchReference | 'repo-not-found'> {
    const query = `query { repository(owner: "${repo.owner}", name: "${repo.name}") { ${repoQuery()} } }`
    const json = await queryGraphqlApi(ghToken, query, null)
    return resultFromData(json.data)
}

// lookup the default branch name and its HEAD's commit object id, scoped to a user's personal repo
export async function getViewerRepoDefaultBranch(
    ghToken: string,
    repo: string,
): Promise<RepoBranchReference | 'repo-not-found'> {
    const query = `query { viewer { repository(name: "${repo}") { ${repoQuery()} } } }`
    const json = await queryGraphqlApi(ghToken, query, null)
    return resultFromData(json.data)
}
