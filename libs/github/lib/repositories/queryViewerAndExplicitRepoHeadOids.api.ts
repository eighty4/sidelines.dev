import {
    splitRepoName,
    type BranchRef,
    type RepoNameWithOwner,
    type RepositoryId,
} from '@sidelines/model'
import { mapBranchRef } from '../repository/_map.ts'
import type { QViewerAndExplicitRepoHeadOidsGraph } from '../graphs.ts'
import queryGraphqlApi, { type GraphqlResponse } from '../queryGraphqlApi.ts'

export async function queryViewerAndExplicitRepoHeadOids(
    ghToken: string,
    repos: Array<RepoNameWithOwner>,
): Promise<Record<RepoNameWithOwner, BranchRef>> {
    const query = buildFirstPageQuery(repos.map(splitRepoName))
    const json = await queryGraphqlApi<
        null,
        QViewerAndExplicitRepoHeadOidsGraph
    >(ghToken, query, null)

    // immediately kick off fetching next page while parsing first
    const { repositories: initialViewerRepos } = json.data.viewer
    let fetchingSecondPage: Promise<
        GraphqlResponse<QViewerAndExplicitRepoHeadOidsGraph>
    > | null = null
    if (initialViewerRepos.pageInfo.hasNextPage) {
        fetchingSecondPage = queryGraphqlApi<
            null,
            QViewerAndExplicitRepoHeadOidsGraph
        >(
            ghToken,
            buildViewerRepoCursorQuery(initialViewerRepos.pageInfo.endCursor),
            null,
        )
    }

    // collect results by nameWithOwner to dedupe explicit repos
    // that get picked up by OWNER or COLLABORATOR
    const result: Record<RepoNameWithOwner, BranchRef> = {}

    // collect explicit repos from their `r0..` aliased node
    for (let i = 0; i < repos.length; i++) {
        const repo = json.data[`r${i}`]
        if (repo?.defaultBranchRef) {
            result[repos[i]] = mapBranchRef(repo.defaultBranchRef)
        }
    }

    // collect OWNER and COLLABORATOR repos
    for (const {
        nameWithOwner,
        defaultBranchRef,
    } of initialViewerRepos.nodes) {
        if (defaultBranchRef && !result[nameWithOwner]) {
            result[nameWithOwner] = mapBranchRef(defaultBranchRef)
        }
    }

    // continuously page viewer repos
    let pagingViewerRepos: Promise<
        GraphqlResponse<QViewerAndExplicitRepoHeadOidsGraph>
    > | null = fetchingSecondPage
    let pagingNextViewerRepos: Promise<
        GraphqlResponse<QViewerAndExplicitRepoHeadOidsGraph>
    > | null = null
    while (pagingViewerRepos) {
        const json = await pagingViewerRepos
        if (json.data.viewer.repositories.pageInfo.hasNextPage) {
            pagingNextViewerRepos = queryGraphqlApi<
                null,
                QViewerAndExplicitRepoHeadOidsGraph
            >(
                ghToken,
                buildViewerRepoCursorQuery(
                    json.data.viewer.repositories.pageInfo.endCursor,
                ),
                null,
            )
        }
        const repoNodes = json.data.viewer.repositories.nodes
        for (const { nameWithOwner, defaultBranchRef } of repoNodes) {
            if (defaultBranchRef && !result[nameWithOwner]) {
                result[nameWithOwner] = mapBranchRef(defaultBranchRef)
            }
        }
        pagingViewerRepos = pagingNextViewerRepos
    }

    return result
}

function buildOidQuery(): string {
    return `defaultBranchRef { name target { ... on Commit { history(first: 1) { edges { node { ... on Commit { oid } } } } } } }`
}

function buildViewerRepoPagingQuery(): string {
    return `nodes { nameWithOwner ${buildOidQuery()} } pageInfo { endCursor hasNextPage }`
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
    return `query QViewerAndExplicitRepoHeadOids { ${nodes.join(' ')} }`
}

function buildViewerRepoCursorQuery(cursor: string): string {
    return `viewer { repositories (ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], first: 100, after: "${cursor}") { ${buildViewerRepoPagingQuery()} } }`
}
