import type {
    CommitRepoAddition,
    CreateCommitInputs,
} from '@sidelines/github/repository/mutationCreateCommitOnBranch'
import type { RepositoryId } from '@sidelines/model'
import { connectToDb, DB_STORE_COMMIT_REVIEW } from '../database.ts'
import { opfsLookupDir, opfsWriteFile } from '../opfs.ts'

export type CommitReviewRecord = {
    reviewId: string
    commit: CreateCommitInputs
}

function createRecord(
    reviewId: string,
    commit: CreateCommitInputs,
): CommitReviewRecord {
    return { reviewId, commit }
}

export async function saveRepoCommitReview(
    commit: CreateCommitInputs,
): Promise<CommitReviewRecord> {
    const reviewId = crypto.randomUUID()
    if (commit.additions) {
        await writeAdditionsToOpfs(reviewId, commit.repo, commit.additions)
    }
    await writeRecordToDb(createRecord(reviewId, commit))
    return {
        reviewId,
        commit,
    }
}

async function writeRecordToDb(record: CommitReviewRecord) {
    const db = await connectToDb()
    await new Promise<void>((res, rej) => {
        const tx = db.transaction([DB_STORE_COMMIT_REVIEW], 'readwrite')
        tx.objectStore(DB_STORE_COMMIT_REVIEW).put(record)
        tx.commit()

        tx.oncomplete = () => res()

        tx.onerror = e => {
            console.error('db error', e)
            rej(e)
        }
    })
}

// todo call from diff ui resync required before review approval
export async function updateCommitReviewRecordHeadOid(
    reviewId: string,
    headOid: string,
) {
    const db = await connectToDb()
    await new Promise<void>((res, rej) => {
        const tx = db.transaction([DB_STORE_COMMIT_REVIEW], 'readwrite')
        const objectStore = tx.objectStore(DB_STORE_COMMIT_REVIEW)
        const request: IDBRequest<CommitReviewRecord> =
            objectStore.get(reviewId)
        request.onsuccess = () => {
            request.result.commit.branch.headOid = headOid
            objectStore.put(request.result)
            tx.commit()
        }

        tx.oncomplete = () => res()

        tx.onerror = e => {
            console.error('db error', e)
            rej(e)
        }
    })
}

async function writeAdditionsToOpfs(
    reviewId: string,
    repo: RepositoryId,
    additions: Array<CommitRepoAddition>,
): Promise<void> {
    const dirHandles: Record<string, Promise<FileSystemDirectoryHandle>> = {}
    await Promise.all(
        additions.map(async addition => {
            if (!dirHandles[addition.dirpath]) {
                dirHandles[addition.dirpath] = opfsLookupDir(
                    'CMMT_RVW',
                    reviewId,
                    repo.owner,
                    repo.name,
                    ...addition.dirpath.split('/'),
                )
            }
            await opfsWriteFile(
                await dirHandles[addition.dirpath],
                addition.filename,
                addition.content,
            )
        }),
    )
}
