import type { RepositoryId } from '@sidelines/model'
import { queryGraphqlApi } from '../../request.ts'

export async function getMultipleRepoObjectContents(
    ghToken: string,
    repo: RepositoryId,
    paths: Array<string>,
    ref: string = 'HEAD',
): Promise<Record<string, string | null> | 'repo-not-found'> {
    const query = buildQuery(repo, ref, paths)
    const json = await queryGraphqlApi<null, GraphData>(ghToken, query, null)
    if (!json.data.repository) {
        return 'repo-not-found'
    }
    const result: Record<string, string | null> = {}
    for (let i = 0; i < paths.length; i++) {
        result[paths[i]] = json.data.repository[`obj${i}`]?.text || null
    }
    return result
}

function buildQuery(
    repo: RepositoryId,
    ref: string,
    paths: Array<string>,
): string {
    const objects: Array<string> = []
    for (let i = 0; i < paths.length; i++) {
        objects.push(
            `obj${i}: object(expression: "${ref}:${paths[i]}") { ... on Blob { text } }`,
        )
    }
    return `query RepoObjectContents { repository(owner: "${repo.owner}", name: "${repo.name}") { ${objects.join(' ')} } }`
}

type GraphData = {
    repository: Record<
        `obj${string}`,
        {
            text: string
        }
    >
}
