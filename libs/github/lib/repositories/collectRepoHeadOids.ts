import type { RepoHeadRef, RepositoryId } from '@sidelines/model'
import { queryGraphqlApi } from '../request.ts'

export async function collectRepoHeadOids(
    ghToken: string,
    repos: Array<RepositoryId>,
): Promise<Array<RepoHeadRef>> {
    const oidQ = `defaultBranchRef { name target { ... on Commit { history(first: 1) { edges { node { ... on Commit { oid } } } } } } }`
    const nodes: Array<string> = []
    for (let i = 0; i < repos.length; i++) {
        const r = repos[i]
        nodes.push(
            `r${i}: repository(owner: "${r.owner}", name: "${r.name}") { ${oidQ} }`,
        )
    }
    const repoQ = `nodes { name owner { login } ${oidQ} } pageInfo { endCursor hasNextPage }`
    nodes.push(
        `viewer { repositories (ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], first: 100) { ${repoQ} } }`,
    )
    const query = `query CollectRepoHeadOids { ${nodes.join(' ')} }`
    const json = await queryGraphqlApi(ghToken, query, null)

    // immediately kick off fetching next page while parsing first
    const { repositories } = json.data.viewer
    let nextPageQ: ((cursor: string) => string) | null = null
    let fetchingNextPage: Promise<any> | null = null
    if (repositories.pageInfo.hasNextPage) {
        nextPageQ = (c: string) =>
            `viewer { repositories (ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], first: 100, after: "${c}") { ${repoQ} } }`
        fetchingNextPage = queryGraphqlApi(
            ghToken,
            nextPageQ(repositories.pageInfo.endCursor),
            null,
        )
    }

    // collect results by nameWithOwner to dedupe explicit repos
    // that get picked up by OWNER or COLLABORATOR
    const result: Record<string, RepoHeadRef> = {}

    // collect explicit repos from their `r0..` aliased node
    for (let i = 0; i < repos.length; i++) {
        const res = json.data['r' + i]
        if (res) {
            const repo = repos[i]
            result[`${repo.owner}/${repo.name}`] = {
                repo,
                defaultBranch: res.defaultBranchRef.name,
                sha: res.defaultBranchRef.target.history.edges[0].node.oid,
            }
        }
    }

    // collect OWNER and COLLABORATOR repos
    repositories.nodes.forEach((repo: any) => {
        const nameWithOwner = `${repo.owner.login}/${repo.name}`
        if (!result[nameWithOwner]) {
            result[nameWithOwner] = {
                repo: { owner: repo.owner.login, name: repo.name },
                defaultBranch: repo.defaultBranchRef.name,
                sha: repo.defaultBranchRef.target.history.edges[0].node.oid,
            }
        }
    })

    if (fetchingNextPage) {
        const json = await fetchingNextPage
        if (json.data.repositories.pageInfo.hasNextPage) {
            fetchingNextPage = queryGraphqlApi(
                ghToken,
                nextPageQ!(repositories.pageInfo.endCursor),
                null,
            )
        }
    }

    return Object.values(result)
}
