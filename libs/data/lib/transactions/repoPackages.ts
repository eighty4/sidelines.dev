import {
    joinRepoName,
    splitRepoName,
    type BranchRef,
    type RepoNameWithOwner,
    type RepositoryId,
    type RepositoryPackage,
} from '@sidelines/model'
import { RefNotFound, RepoNotFound } from '@sidelines/model/errors'
import { findRepoPackages } from '@sidelines/packages/findRepoPackages'
import type { RepoPackagesRecord } from '../records.ts'
import { DB_STORE_REPO_PACKAGES } from '../stores.ts'
import { idbGetRecord, idbPutRecord } from '../tx.ts'
import { readRepoHead } from './repoHeads.ts'

const LOG_LABEL = '@sidelines/data/tx/readRepoPackages'

// todo RefNotFound from readRepoHead could openCursor and attempt to find most recent computed packages data
export async function readRepoPackages(
    db: IDBDatabase,
    ghToken: string,
    repo: RepositoryId,
): Promise<
    Array<RepositoryPackage> | typeof RefNotFound | typeof RepoNotFound
> {
    const defaultBranch = await readRepoHead(db, ghToken, repo)
    console.log(LOG_LABEL, 'default branch', defaultBranch)
    switch (defaultBranch) {
        case RefNotFound:
        case RepoNotFound:
            return defaultBranch
    }
    const nameWithOwner: RepoNameWithOwner = joinRepoName(repo)
    const fromDb = await readFromDb(db, nameWithOwner, defaultBranch)
    console.log(LOG_LABEL, 'read from db', fromDb)
    if (fromDb) {
        return fromDb
    }
    const fromApi = await findRepoPackages(ghToken, repo, defaultBranch)
    console.log(LOG_LABEL, 'fetch from api', fromDb)
    if (fromApi === RepoNotFound) {
        return fromApi
    }
    await writeToDb(db, nameWithOwner, defaultBranch, fromApi)
    return fromApi
}

export async function updateRepoPackages(
    db: IDBDatabase,
    ghToken: string,
    repo: RepoNameWithOwner,
    defaultBranch: BranchRef,
) {
    const packages = await findRepoPackages(
        ghToken,
        splitRepoName(repo),
        defaultBranch,
    )
    if (packages === RepoNotFound) {
        return
    }
    await writeToDb(db, repo, defaultBranch, packages)
}

async function readFromDb(
    db: IDBDatabase,
    nameWithOwner: RepoNameWithOwner,
    defaultBranch: BranchRef,
): Promise<Array<RepositoryPackage> | null> {
    const record = await idbGetRecord<RepoPackagesRecord>(
        db,
        DB_STORE_REPO_PACKAGES,
        [nameWithOwner, defaultBranch.name, defaultBranch.headOid],
    )
    return record?.packages || null
}

function writeToDb(
    db: IDBDatabase,
    nameWithOwner: RepoNameWithOwner,
    defaultBranch: BranchRef,
    packages: Array<RepositoryPackage>,
): Promise<void> {
    return idbPutRecord<RepoPackagesRecord>(db, DB_STORE_REPO_PACKAGES, {
        nameWithOwner,
        defaultBranch: defaultBranch.name,
        headOid: defaultBranch.headOid,
        committedWhen: defaultBranch.committedDate,
        packages,
    })
}
