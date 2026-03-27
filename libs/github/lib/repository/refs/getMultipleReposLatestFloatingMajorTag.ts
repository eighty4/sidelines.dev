import { RepositoryValues, type RepositoryId } from '@sidelines/model'
import { queryGraphqlApi } from '../../request.ts'
import { findLatestFloatingMajorTag } from './_findLatestFloatingMajorTag.ts'

export async function getMultipleReposLatestFloatingMajorTag(
    ghToken: string,
    repos: Array<RepositoryId>,
): Promise<RepositoryValues<string>> {
    if (!repos.length) {
        throw TypeError()
    }
    const json = await queryGraphqlApi<GraphVars, GraphData>(
        ghToken,
        buildQuery(repos),
        { tags: 10 },
    )
    console.log(JSON.stringify(json))
    const result = new RepositoryValues<string>()
    for (let i = 0; i < repos.length; i++) {
        const repoId = repos[i]
        const repoObj = json.data[`repo${i}`]
        if (repoObj?.refs.edges.length) {
            const tags = repoObj?.refs.edges.map(
                (edge: RefEdge) => edge.node.name,
            )
            const latestMajor = findLatestFloatingMajorTag(tags)
            if (latestMajor) {
                result.setValue(repoId, latestMajor)
            }
        }
    }
    return result
}

type GraphVars = { tags: number }

type GraphData = Record<
    `repo${string}`,
    null | {
        refs: {
            edges: Array<{
                node: {
                    name: string
                }
            }>
        }
    }
>

function buildQuery(repos: Array<RepositoryId>): string {
    const repoQueries = repos.map((repo, i) => {
        return `repo${i}: repository(owner: "${repo.owner}", name: "${repo.name}") { refs( refPrefix: "refs/tags/" first: $tags orderBy: { field: TAG_COMMIT_DATE, direction: DESC } ) { edges { node { name } } } }`
    })
    return `query RepoLatestTags($tags: Int!) { ${repoQueries} }`
}

type RefEdge = {
    node: { name: string }
}
