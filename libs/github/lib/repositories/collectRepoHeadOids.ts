import type { RepoDefaultBranch, RepositoryId } from '@sidelines/model'
import { queryGraphqlApi } from '../request.ts'

export async function collectRepoHeadOids(
    ghToken: string,
    repos: Array<RepositoryId>,
): Promise<Array<RepoDefaultBranch>> {
    const query = buildFirstPageQuery(repos)
    const json = await queryGraphqlApi<null, FirstPageGraphData>(
        ghToken,
        query,
        null,
    )

    // immediately kick off fetching next page while parsing first
    const { repositories } = json.data.viewer
    console.log(json.data)
    let fetchingNextPage: Promise<any> | null = null
    if (repositories.pageInfo.hasNextPage) {
        fetchingNextPage = queryGraphqlApi<null, ViewerRepoCursorGraphData>(
            ghToken,
            buildViewerRepoCursorQuery(repositories.pageInfo.endCursor),
            null,
        )
    }

    // collect results by nameWithOwner to dedupe explicit repos
    // that get picked up by OWNER or COLLABORATOR
    const result: Record<string, RepoDefaultBranch> = {}

    // collect explicit repos from their `r0..` aliased node
    for (let i = 0; i < repos.length; i++) {
        const res = json.data[`r${i}`]
        if (res) {
            const repo = repos[i]
            result[`${repo.owner}/${repo.name}`] = mapRepoDefaultBranch(
                repo,
                res.defaultBranchRef,
            )
        }
    }

    // collect OWNER and COLLABORATOR repos
    repositories.nodes.forEach((repo: RepoPath & RepoDefaultBranchHeadOid) => {
        const nameWithOwner = `${repo.owner.login}/${repo.name}`
        if (!result[nameWithOwner]) {
            result[nameWithOwner] = mapRepoDefaultBranch(
                { owner: repo.owner.login, name: repo.name },
                repo.defaultBranchRef,
            )
        }
    })

    if (fetchingNextPage) {
        const json = await fetchingNextPage
        if (json.data.repositories.pageInfo.hasNextPage) {
            fetchingNextPage = queryGraphqlApi<null, ViewerRepoCursorGraphData>(
                ghToken,
                buildViewerRepoCursorQuery(repositories.pageInfo.endCursor),
                null,
            )
        }
    }

    return Object.values(result)
}

type RepoDefaultBranchHeadOid = {
    defaultBranchRef: {
        name: string
        target: {
            history: {
                edges: Array<{
                    node: {
                        committedDate: string
                        oid: string
                    }
                }>
            }
        }
    }
}

type RepoPath = {
    name: string
    owner: {
        login: string
    }
}

type FirstPageGraphData = {
    [key: `r${number}`]: RepoDefaultBranchHeadOid
    viewer: {
        repositories: {
            nodes: Array<RepoPath & RepoDefaultBranchHeadOid>
            pageInfo: {
                hasNextPage: boolean
                endCursor: string
            }
        }
    }
}

type ViewerRepoCursorGraphData = {
    nodes: Array<RepoDefaultBranchHeadOid>
    pageInfo: {
        hasNextPage: boolean
        endCursor: string
    }
}

function buildOidQuery(): string {
    return `defaultBranchRef { name target { ... on Commit { history(first: 1) { edges { node { ... on Commit { committedDate, oid } } } } } } }`
}

function buildViewerRepoPagingQuery(): string {
    return `nodes { name owner { login } ${buildOidQuery()} } pageInfo { endCursor hasNextPage }`
}

function buildFirstPageQuery(repos: Array<RepositoryId>): string {
    const oidQ = buildOidQuery()
    const nodes: Array<string> = []
    for (let i = 0; i < repos.length; i++) {
        const r = repos[i]
        nodes.push(
            `r${i}: repository(owner: "${r.owner}", name: "${r.name}") { ${oidQ} }`,
        )
    }
    nodes.push(
        `viewer { repositories (ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], first: 100) { ${buildViewerRepoPagingQuery()} } }`,
    )
    return `query CollectRepoHeadOids { ${nodes.join(' ')} }`
}

function buildViewerRepoCursorQuery(cursor: string): string {
    return `viewer { repositories (ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], first: 100, after: "${cursor}") { ${buildViewerRepoPagingQuery()} } }`
}

function mapRepoDefaultBranch(
    repo: RepositoryId,
    defaultBranchRef: RepoDefaultBranchHeadOid['defaultBranchRef'],
): RepoDefaultBranch {
    console.log(repo, defaultBranchRef)
    const commit = defaultBranchRef.target.history.edges[0].node
    return {
        repo,
        defaultBranch: {
            name: defaultBranchRef.name,
            headOid: commit.oid,
            committedDate: new Date(commit.committedDate),
        },
    }
}
