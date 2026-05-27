import queryRepoDefaultBranch from '@sidelines/github/repository/queryRepoDefaultBranch'
import queryRepoDirListing from '@sidelines/github/repository/objects/queryRepoDirListing'
import queryRepoObjectContent from '@sidelines/github/repository/objects/queryRepoObjectContent'
import type {
    BranchRef,
    RepositoryId,
    RepositoryObject,
} from '@sidelines/model'
import { RepoNotFound } from '@sidelines/model/errors'
import { DB_STORE_REPO_FILES, idbGetRecord } from '../database.ts'
import { opfsLookupDir, opfsReadFile, opfsWriteFile } from '../opfs.ts'

const OPFS_PREFIX = 'REPO_SRCS'

// DB_STORE_REPO_FILES
export type ReadRepoContent = {
    ghToken: string
    repo: RepositoryId
    dirpath: string | null
    filename: string
}

// todo support offline
//  write latest sha to indexeddb and using if getRepoDefaultBranch fails for network
export async function readRepoContent({
    dirpath,
    filename,
    ghToken,
    repo,
}: ReadRepoContent): Promise<string | 'file-not-found' | 'repo-not-found'> {
    const defaultBranch = await queryRepoDefaultBranch(ghToken, repo)
    if (defaultBranch === RepoNotFound) {
        return 'repo-not-found'
    }
    console.log(
        'reading',
        `${repo.owner}/${repo.name}`,
        defaultBranch.name,
        defaultBranch.headOid,
        filename,
        'from',
        dirpath,
    )
    const dirHandle = await lookupRepoSourceDir(repo, defaultBranch, dirpath)
    const fromFile = await opfsReadFile(dirHandle, filename)
    if (fromFile !== null) {
        return fromFile
    }
    const fromApi = await queryRepoObjectContent(
        ghToken,
        repo,
        dirpath ? `${dirpath}/${filename}` : filename,
    )
    if (fromApi === null) {
        return 'file-not-found'
    }
    await opfsWriteFile(dirHandle, filename, fromApi)
    return fromApi
}

async function lookupRepoSourceDir(
    repo: RepositoryId,
    defaultBranch: BranchRef,
    dirpath: string | null,
): Promise<FileSystemDirectoryHandle> {
    if (dirpath === null) {
        return await opfsLookupDir(
            OPFS_PREFIX,
            repo.owner,
            repo.name,
            defaultBranch.headOid,
        )
    } else {
        return await opfsLookupDir(
            OPFS_PREFIX,
            repo.owner,
            repo.name,
            defaultBranch.headOid,
            ...dirpath.split('/'),
        )
    }
}

export type ReadRepoListing = {
    ghToken: string
    repo: RepositoryId
    dirpath: string | null
}

export async function readRepoListing({
    ghToken,
    repo,
    dirpath,
}: ReadRepoListing): Promise<Array<RepositoryObject> | 'repo-not-found'> {
    const branchRef = await queryRepoDefaultBranch(ghToken, repo)
    if (branchRef === RepoNotFound) {
        return 'repo-not-found'
    }
    await readDirListingFromDb(repo, branchRef, dirpath)
    return await queryRepoDirListing(ghToken, repo, dirpath)
}

type RepoListingRecord = {
    owner: string
    name: string
    sha: string
    dirpath: string
    objects: Array<RepositoryObject>
}

async function readDirListingFromDb(
    repo: RepositoryId,
    defaultBranch: BranchRef,
    dirpath: string | null,
): Promise<Array<RepositoryObject> | null> {
    const record = await idbGetRecord<RepoListingRecord>(DB_STORE_REPO_FILES, [
        repo.owner,
        repo.name,
        defaultBranch.headOid,
        dirpath || '',
    ])
    return record?.objects || null
}
