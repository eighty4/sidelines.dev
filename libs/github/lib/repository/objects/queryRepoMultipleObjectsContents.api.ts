import type { RepositoryId } from '@sidelines/model'
import { RepoNotFound } from '@sidelines/model/errors'
import queryGraphqlApi from '../../queryGraphqlApi.ts'
import type {
    QRepoMultipleObjectContentsGraph,
    QRepoMultipleObjectContentsVars,
} from '../../graphs.ts'

export default async function queryRepoMultipleObjectsContents(
    ghToken: string,
    repo: RepositoryId,
    paths: Array<string>,
    ref: string = 'HEAD',
): Promise<Record<string, string | null> | typeof RepoNotFound> {
    const query = buildQuery(ref, paths)
    const json = await queryGraphqlApi<
        QRepoMultipleObjectContentsVars,
        QRepoMultipleObjectContentsGraph
    >(ghToken, query, repo)
    if (!json.data.repository) {
        return RepoNotFound
    }
    const result: Record<string, string | null> = {}
    for (let i = 0; i < paths.length; i++) {
        result[paths[i]] = json.data.repository[`obj${i}`]?.text || null
    }
    return result
}

function buildQuery(ref: string, paths: Array<string>): string {
    const objects: Array<string> = []
    for (let i = 0; i < paths.length; i++) {
        objects.push(
            `obj${i}: object(expression: "${ref}:${paths[i]}") { ... on Blob { text } }`,
        )
    }
    return `query QRepoMultipleObjectContents($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${objects.join(' ')} } }`
}
