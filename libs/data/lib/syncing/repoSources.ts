import {
    getRepoDefaultBranch,
    getRepoDirListing,
    getRepoObjectContent,
    type RepoBranchReference,
} from '@sidelines/github'
import type { RepositoryId, RepositoryObject } from '@sidelines/model'
import { connectToDb, DB_STORE_REPO_FILES } from '../database.ts'

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
    const branchRef = await getRepoDefaultBranch(ghToken, repo)
    if (branchRef === 'repo-not-found') {
        return 'repo-not-found'
    }
    console.log(
        'reading',
        `${repo.owner}/${repo.name}`,
        branchRef.name,
        branchRef.headOid,
        filename,
        'from',
        dirpath,
    )
    const fromFile = await readFile(repo, branchRef, dirpath, filename)
    if (fromFile !== null) {
        return fromFile
    }
    const fromApi = await getRepoObjectContent(
        ghToken,
        repo,
        dirpath ? `${dirpath}/${filename}` : filename,
    )
    if (fromApi === null) {
        return 'file-not-found'
    }
    await writeFile(repo, branchRef, dirpath, filename, fromApi)
    return fromApi
}

async function lookupDir(
    repo: RepositoryId,
    branchRef: RepoBranchReference,
    dirpath: string | null,
): Promise<FileSystemDirectoryHandle> {
    let dirHandle = await navigator.storage.getDirectory()
    const dirOpts = { create: true }
    dirHandle = await dirHandle.getDirectoryHandle(repo.owner, dirOpts)
    dirHandle = await dirHandle.getDirectoryHandle(repo.name, dirOpts)
    dirHandle = await dirHandle.getDirectoryHandle(branchRef.headOid, dirOpts)
    if (dirpath !== null) {
        for (const dirpathPortion of dirpath.split('/')) {
            dirHandle = await dirHandle.getDirectoryHandle(
                dirpathPortion,
                dirOpts,
            )
        }
    }
    return dirHandle
}

async function readFile(
    repo: RepositoryId,
    branchRef: RepoBranchReference,
    dirpath: string | null,
    filename: string,
): Promise<string | null> {
    const dirHandle = await lookupDir(repo, branchRef, dirpath)
    try {
        const fileHandle = await dirHandle.getFileHandle(filename)
        const file = await fileHandle.getFile()
        return await file.text()
    } catch (e) {
        if (e instanceof DOMException && e.name === 'NotFoundError') {
            return null
        } else {
            throw e
        }
    }
}

async function writeFile(
    repo: RepositoryId,
    branchRef: RepoBranchReference,
    dirpath: string | null,
    filename: string,
    content: string,
): Promise<void> {
    const dirHandle = await lookupDir(repo, branchRef, dirpath)
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
    const fileWritable = await fileHandle.createWritable()
    await fileWritable.write(content)
    await fileWritable.close()
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
    const branchRef = await getRepoDefaultBranch(ghToken, repo)
    if (branchRef === 'repo-not-found') {
        return 'repo-not-found'
    }
    const db = await connectToDb()
    await readDirListingFromDb(db, repo, branchRef, dirpath)
    return await getRepoDirListing(ghToken, repo, dirpath)
}

type RepoListingRecord = {
    owner: string
    name: string
    sha: string
    dirpath: string
    objects: Array<RepositoryObject>
}

async function readDirListingFromDb(
    db: IDBDatabase,
    repo: RepositoryId,
    branchRef: RepoBranchReference,
    dirpath: string | null,
): Promise<Array<RepositoryObject> | null> {
    return new Promise((res, rej) => {
        const tx = db.transaction(DB_STORE_REPO_FILES, 'readonly')
        const request: IDBRequest<RepoListingRecord | null> = tx
            .objectStore(DB_STORE_REPO_FILES)
            .get([repo.owner, repo.name, branchRef.headOid, dirpath || ''])
        request.onsuccess = () => res(request.result?.objects || null)
        request.onerror = rej
    })
}
