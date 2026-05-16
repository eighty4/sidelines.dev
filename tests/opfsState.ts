import type { Page } from '@playwright/test'
import type { RepoCommitAddition, RepositoryId } from '@sidelines/model'

export async function readFileContent(
    page: Page,
    opfsPath: string,
): Promise<string> {
    return await page.evaluate(async (opfsPath: string) => {
        const paths = opfsPath.split('/')
        let dirHandle = await navigator.storage.getDirectory()
        const dirOpts = { create: true }
        for (const path of paths.slice(0, -1)) {
            dirHandle = await dirHandle.getDirectoryHandle(path, dirOpts)
        }
        const fileHandle = await dirHandle.getFileHandle(paths.at(-1)!)
        const file = await fileHandle.getFile()
        return await file.text()
    }, opfsPath)
}

export async function readRepoCommitAddition(
    page: Page,
    reviewId: string,
    repo: RepositoryId,
    addition: Omit<RepoCommitAddition, 'content'>,
) {
    return await readFileContent(
        page,
        repoCommitAdditionPath(reviewId, repo, addition),
    )
}

function repoCommitAdditionPath(
    reviewId: string,
    repo: RepositoryId,
    addition: Omit<RepoCommitAddition, 'content'>,
): string {
    return `CMMT_RVW/${reviewId}/${repo.owner}/${repo.name}/${addition.dirpath}/${addition.filename}`
}
