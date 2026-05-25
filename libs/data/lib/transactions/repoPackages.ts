import type {
    BranchRef,
    RepositoryId,
    RepositoryPackage,
} from '@sidelines/model'
import { RefNotFound, RepoNotFound } from '@sidelines/model/errors'
import { findRepoPackages } from '@sidelines/packages/findRepoPackages'
import { readRepoHead } from './repoHeads.ts'
import { connectToDb, DB_STORE_REPO_PACKAGES } from '../database.ts'

type PackagesRecord = {
    nameWithOwner: string
    defaultBranch: string
    headOid: string
    committedWhen: Date
    packages: Array<RepositoryPackage>
}

const LOG_LABEL = '@sidelines/data/tx/readRepoPackages'

// todo RefNotFound from readRepoHead could openCursor and attempt to find most recent computed packages data
export async function readRepoPackages(
    ghToken: string,
    repo: RepositoryId,
): Promise<
    Array<RepositoryPackage> | typeof RefNotFound | typeof RepoNotFound
> {
    const defaultBranch = await readRepoHead(ghToken, repo)
    console.log(LOG_LABEL, 'default branch', defaultBranch)
    switch (defaultBranch) {
        case RefNotFound:
        case RepoNotFound:
            return defaultBranch
    }
    const nameWithOwner = `${repo.owner}/${repo.name}`
    const fromDb = await readFromDb(nameWithOwner, defaultBranch)
    console.log(LOG_LABEL, 'read from db', fromDb)
    if (fromDb) {
        return fromDb
    }
    const fromApi = await findRepoPackages(ghToken, repo, defaultBranch)
    console.log(LOG_LABEL, 'fetch from api', fromDb)
    if (fromApi === RepoNotFound) {
        return fromApi
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
        const tx = db.transaction(DB_STORE_REPO_PACKAGES, 'readonly')
        const req: IDBRequest<PackagesRecord | undefined> = tx
            .objectStore(DB_STORE_REPO_PACKAGES)
            .get([nameWithOwner, defaultBranch.name, defaultBranch.headOid])

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
        defaultBranch: defaultBranch.name,
        headOid: defaultBranch.headOid,
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
