import { RepoNotFound, TreeObjectNotFound } from '@sidelines/model/errors'
import { queryViewerRepoDirContents } from '../repository/objects/queryViewerRepoDirContents.api.ts'

export async function queryViewerRepoWorkflowContents(
    ghToken: string,
    repo: string,
): Promise<
    Record<string, string> | typeof RepoNotFound | typeof TreeObjectNotFound
> {
    const result = await queryViewerRepoDirContents(
        ghToken,
        repo,
        '.github/workflows',
    )
    if (result === RepoNotFound || result === TreeObjectNotFound) {
        return result
    } else {
        return Object.fromEntries(
            Object.entries(result.contents).map(([name, content]) => [
                '.github/workflows/' + name,
                content,
            ]),
        )
    }
}
