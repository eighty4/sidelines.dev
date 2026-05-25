import queryRepoDefaultBranch from '@sidelines/github/repository/queryRepoDefaultBranch'
import type { BranchRef, RepositoryId } from '@sidelines/model'
import { RefNotFound, RepoNotFound } from '@sidelines/model/errors'
import { connectToDb, DB_STORE_REPO_HEADS } from '../database.ts'

type HeadRecord = {
    nameWithOwner: string
    defaultBranch: BranchRef
}

const LOG_LABEL = '@sidelines/data/tx/readRepoHead'

// RefNotFound when network query fails & not cached in db
export async function readRepoHead(
    ghToken: string,
    repo: RepositoryId,
): Promise<BranchRef | typeof RefNotFound | typeof RepoNotFound> {
    const nameWithOwner = `${repo.owner}/${repo.name}`
    try {
        const queried = await queryRepoDefaultBranch(ghToken, repo)
        console.log(LOG_LABEL, 'query', queried)
        if (queried === RepoNotFound) {
            return RepoNotFound
        } else {
            await writeToDb(nameWithOwner, queried)
            return queried
        }
    } catch (e) {
        console.error(LOG_LABEL, 'query error', e)
    }
    const fromDb = await readFromDb(nameWithOwner)
    console.log(LOG_LABEL, 'read from db', fromDb)
    if (fromDb) {
        return fromDb
    } else {
        return RefNotFound
    }
}

async function readFromDb(nameWithOwner: string): Promise<BranchRef | null> {
    const db = await connectToDb()
    return new Promise((res, rej) => {
        const tx = db.transaction(DB_STORE_REPO_HEADS, 'readonly')
        const req: IDBRequest<HeadRecord | undefined> = tx
            .objectStore(DB_STORE_REPO_HEADS)
            .get(nameWithOwner)

        req.onsuccess = () => res(req.result?.defaultBranch || null)

        req.onerror = e => {
            console.error(LOG_LABEL, 'db error', e)
            rej(e)
        }
    })
}

async function writeToDb(
    nameWithOwner: string,
    defaultBranch: BranchRef,
): Promise<void> {
    const db = await connectToDb()
    return new Promise((res, rej) => {
        const tx = db.transaction(DB_STORE_REPO_HEADS, 'readwrite')
        const req: IDBRequest = tx
            .objectStore(DB_STORE_REPO_HEADS)
            .put({ nameWithOwner, defaultBranch } satisfies HeadRecord)

        req.onsuccess = () => res()

        req.onerror = e => {
            console.error('db error', e)
            rej(e)
        }
    })
}
