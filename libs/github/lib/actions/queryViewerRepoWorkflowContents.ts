import { NotFoundError } from '../responses.ts'
import { getViewerRepoDirContent } from '../repository/objects/getViewerRepoDirContent.ts'

export async function queryViewerRepoWorkflowContents(
    ghToken: string,
    repo: string,
): Promise<Record<string, string> | NotFoundError> {
    const result = await getViewerRepoDirContent(
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
