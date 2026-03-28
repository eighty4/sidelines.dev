import { NotFoundError } from '../responses.ts'
import { queryViewerRepoDirContent } from '../repository/objects/queryViewerRepoDirContent.api.ts'

export async function queryViewerRepoWorkflowContents(
    ghToken: string,
    repo: string,
): Promise<Record<string, string> | NotFoundError> {
    const result = await queryViewerRepoDirContent(
        ghToken,
        repo,
        '.github/workflows',
    )
    if (result === 'repo-does-not-exist') {
        return new NotFoundError(`viewer does not have a repo \`${repo}\``)
    } else {
        const workflows: Record<string, string> = {}
        for (const object of result) {
            if (object.type === 'file-cat') {
                workflows['.github/workflows/' + object.name] = object.content
            }
        }
        return workflows
    }
}
