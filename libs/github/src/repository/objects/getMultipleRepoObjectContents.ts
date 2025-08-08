import type { RepositoryId } from '@sidelines/model'
import { queryGraphqlApi } from '../../request.ts'

export async function getMultipleRepoObjectContents(
    ghToken: string | null,
    repo: RepositoryId,
    paths: Array<string>,
    ref: string = 'HEAD',
): Promise<Record<string, string | null> | 'repo-not-found'> {
    const objects: Array<string> = []
    for (let i = 0; i < paths.length; i++) {
        objects.push(
            `obj${i}: object(expression: "${ref}:${paths[i]}") { ... on Blob { text } }`,
        )
    }
    const query = `query { repository(owner: "${repo.owner}", name: "${repo.name}") { ${objects.join(' ')} } }`
    const json = await queryGraphqlApi(ghToken, query, null)
    if (!json.data.repository) {
        return 'repo-not-found'
    }
    const result: Record<string, string | null> = {}
    for (let i = 0; i < paths.length; i++) {
        result[paths[i]] = json.data.repository['obj' + i]?.text || null
    }
    return result
}
