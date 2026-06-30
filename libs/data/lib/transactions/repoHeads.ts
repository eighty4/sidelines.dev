import queryRepoDefaultBranch from '@sidelines/github/repository/queryRepoDefaultBranch'
import {
    joinRepoName,
    type BranchRef,
    type RepoNameWithOwner,
    type RepositoryId,
} from '@sidelines/model'
import { RefNotFound, RepoNotFound } from '@sidelines/model/errors'
import { DB_STORE_REPO_HEADS } from '../database.ts'
import type { RepoHeadRecord } from '../records.ts'

const LOG_LABEL = '@sidelines/data/tx/readRepoHead'

// returns RefNotFound when network query fails & not cached in db
export async function readRepoHead(
    db: IDBDatabase,
    ghToken: string,
    repo: RepositoryId,
): Promise<BranchRef | typeof RefNotFound | typeof RepoNotFound> {
    const queryingFromApi = queryRepoDefaultBranch(ghToken, repo)
    try {
        const queried = await queryingFromApi
        console.log(LOG_LABEL, 'query', queried)
        if (queried === RepoNotFound) {
            return RepoNotFound
        } else {
            await writeToDb(db, joinRepoName(repo), queried)
            return queried
        }
    } catch (e) {
        console.error(LOG_LABEL, 'query error', e)
    }
    const fromDb = await readFromDb(db, joinRepoName(repo))
    console.log(LOG_LABEL, 'read from db', fromDb)
    if (fromDb) {
        return fromDb
    } else {
        return RefNotFound
    }
}

function readFromDb(
    db: IDBDatabase,
    nameWithOwner: RepoNameWithOwner,
): Promise<BranchRef | null> {
    return new Promise((res, rej) => {
        const tx = db.transaction(DB_STORE_REPO_HEADS, 'readonly')
        const req: IDBRequest<RepoHeadRecord | undefined> = tx
            .objectStore(DB_STORE_REPO_HEADS)
            .get(nameWithOwner)

        req.onsuccess = () => res(req.result?.defaultBranch || null)

        req.onerror = e => {
            console.error(LOG_LABEL, 'db error', e)
            rej(e)
        }
    })
}

function writeToDb(
    db: IDBDatabase,
    repo: RepoNameWithOwner,
    defaultBranch: BranchRef,
): Promise<void> {
    return new Promise((res, rej) => {
        const tx = db.transaction(DB_STORE_REPO_HEADS, 'readwrite')
        const req: IDBRequest = tx
            .objectStore(DB_STORE_REPO_HEADS)
            .put({ repo, defaultBranch } satisfies RepoHeadRecord)

        req.onsuccess = () => res()

        req.onerror = e => {
            console.error('db error', e)
            rej(e)
        }
    })
}
