import type {
    BranchRef,
    RepoNameWithOwner,
    RepositoryId,
    RepositoryPackage,
} from '@sidelines/model'
import { RefNotFound, RepoNotFound } from '@sidelines/model/errors'
import { findRepoPackages } from '@sidelines/packages/findRepoPackages'
import {
    DB_STORE_REPO_PACKAGES,
    idbGetRecord,
    idbPutRecord,
} from '../database.ts'
import { readRepoHead } from './repoHeads.ts'

// DB_STORE_REPO_PACKAGES
type PackagesRecord = {
    nameWithOwner: RepoNameWithOwner
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
    const nameWithOwner: RepoNameWithOwner = `${repo.owner}/${repo.name}`
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
    nameWithOwner: RepoNameWithOwner,
    defaultBranch: BranchRef,
): Promise<Array<RepositoryPackage> | null> {
    const record = await idbGetRecord<PackagesRecord>(DB_STORE_REPO_PACKAGES, [
        nameWithOwner,
        defaultBranch.name,
        defaultBranch.headOid,
    ])
    return record?.packages || null
}

async function writeToDb(
    nameWithOwner: RepoNameWithOwner,
    defaultBranch: BranchRef,
    packages: Array<RepositoryPackage>,
): Promise<void> {
    await idbPutRecord<PackagesRecord>(DB_STORE_REPO_PACKAGES, {
        nameWithOwner,
        defaultBranch: defaultBranch.name,
        headOid: defaultBranch.headOid,
        committedWhen: defaultBranch.committedDate,
        packages,
    })
}
