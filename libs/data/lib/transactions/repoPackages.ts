import queryRepoDefaultBranch from '@sidelines/github/repository/queryRepoDefaultBranch'
import type {
    BranchRef,
    RepositoryId,
    RepositoryPackage,
} from '@sidelines/model'
import { findRepoPackages } from '@sidelines/packages/findRepoPackages'
import { connectToDb, DB_STORE_REPO_PACKAGES } from '../database.ts'

type PackagesRecord = {
    nameWithOwner: string
    commitHash: string
    committedWhen: Date
    packages: Array<RepositoryPackage>
}

// todo support offline
export async function readRepoPackages(
    ghToken: string,
    repo: RepositoryId,
): Promise<Array<RepositoryPackage> | 'repo-not-found'> {
    const defaultBranch = await queryRepoDefaultBranch(ghToken, repo)
    if (defaultBranch === 'repo-not-found') {
        return 'repo-not-found'
    }
    const nameWithOwner = `${repo.owner}/${repo.name}`
    const fromDb = await readFromDb(nameWithOwner, defaultBranch)
    if (fromDb) {
        return fromDb
    }
    const fromApi = await findRepoPackages(ghToken, repo, defaultBranch)
    if (fromApi === 'repo-not-found') {
        return 'repo-not-found'
    }
    await writeToDb(nameWithOwner, defaultBranch, fromApi)
    return fromApi
}

async function readFromDb(
    nameWithOwner: string,
    defaultBranch: BranchRef,
): Promise<Array<RepositoryPackage> | null> {
    const db = await connectToDb()
    return new Promise((res, rej) => {
        const tx = db.transaction([DB_STORE_REPO_PACKAGES], 'readonly')
        const req: IDBRequest<PackagesRecord | undefined> = tx
            .objectStore(DB_STORE_REPO_PACKAGES)
            .get([nameWithOwner, defaultBranch.headOid])

        req.onsuccess = () => res(req.result?.packages || null)

        req.onerror = e => {
            console.error('db error', e)
            rej(e)
        }
    })
}

async function writeToDb(
    nameWithOwner: string,
    defaultBranch: BranchRef,
    packages: Array<RepositoryPackage>,
): Promise<void> {
    const record: PackagesRecord = {
        nameWithOwner,
        commitHash: defaultBranch.headOid,
        committedWhen: defaultBranch.committedDate,
        packages,
    }
    const db = await connectToDb()
    return new Promise((res, rej) => {
        const tx = db.transaction([DB_STORE_REPO_PACKAGES], 'readwrite')
        const req: IDBRequest = tx
            .objectStore(DB_STORE_REPO_PACKAGES)
            .put(record)

        req.onsuccess = () => res()

        req.onerror = e => {
            console.error('db error', e)
            rej(e)
        }
    })
}
