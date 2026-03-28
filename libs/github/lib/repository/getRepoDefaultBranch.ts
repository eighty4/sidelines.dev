import type { BranchRef, RepositoryId } from '@sidelines/model'
import { queryGraphqlApi } from '../request.ts'

function repoQuery() {
    return `defaultBranchRef { name target { ... on Commit { history(first: 1) { edges { node { ... on Commit { committedDate, oid } } } } } } }`
}

export async function getRepoDefaultBranch(
    ghToken: string,
    repo: RepositoryId,
): Promise<BranchRef | 'repo-not-found'> {
    const query = `query { repository(owner: "${repo.owner}", name: "${repo.name}") { ${repoQuery()} } }`
    const json = await queryGraphqlApi<null, QueryRepo>(ghToken, query, null)
    return resultFromData(json.data)
}

// lookup the default branch name and its HEAD's commit object id, scoped to a user's personal repo
export async function getViewerRepoDefaultBranch(
    ghToken: string,
    repo: string,
): Promise<BranchRef | 'repo-not-found'> {
    const query = `query { viewer { repository(name: "${repo}") { ${repoQuery()} } } }`
    const json = await queryGraphqlApi<null, QueryViewerRepo>(
        ghToken,
        query,
        null,
    )
    return resultFromData(json.data.viewer)
}

type QueryRepo = RepoGraphData

type QueryViewerRepo = {
    viewer: RepoGraphData
}

type RepoGraphData = {
    repository: {
        defaultBranchRef: {
            name: string
            target: {
                history: {
                    edges: Array<{
                        node: {
                            name: string
                            headOid: string
                            committedDate: string
                        }
                    }>
                }
            }
        }
    }
}

function resultFromData(data: RepoGraphData): BranchRef | 'repo-not-found' {
    if (!data.repository) {
        return 'repo-not-found'
    }
    const dbr = data.repository.defaultBranchRef
    const commit = dbr.target.history.edges[0].node
    return {
        name: dbr.name,
        headOid: commit.headOid,
        committedDate: new Date(commit.committedDate),
    }
}
