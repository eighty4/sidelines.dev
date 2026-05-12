import { RepositoryValues, type RepositoryId } from '@sidelines/model'
import { findLatestFloatingMajorTag } from './floatingMajorTag.api.ts'
import queryGraphqlApi from '../../queryGraphqlApi.ts'

export async function queryMultipleReposLatestFloatingMajorTag(
    ghToken: string,
    repos: Array<RepositoryId>,
): Promise<RepositoryValues<`v${number}`>> {
    if (!repos.length) {
        throw TypeError()
    }
    console.log('fetching floating major tags of', repos.length, 'repos')
    const json = await queryGraphqlApi<GraphVars, GraphData>(
        ghToken,
        buildQuery(repos),
        { tags: 10 },
    )
    const result = new RepositoryValues<`v${number}`>()
    for (let i = 0; i < repos.length; i++) {
        const repoId = repos[i]
        const repoObj = json.data[`repo${i}`]
        if (repoObj?.refs.edges.length) {
            const tags = repoObj?.refs.edges.map(
                (edge: RefEdge) => edge.node.name,
            )
            const latestMajor = findLatestFloatingMajorTag(tags)
            if (latestMajor) {
                console.log(
                    'found lastest floating major tag',
                    repoId,
                    latestMajor,
                )
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
