import { joinRepoName, type RepositoryId } from '@sidelines/model'
import type {
    RepoCommitAddition,
    RepoCommitInputs,
    RepoCommitReview,
} from '@sidelines/model/commits'
import { ulid } from 'ulid'
import { DB_STORE_COMMIT_REVIEW } from '../database.ts'
import { opfsLookupDir, opfsWriteFile } from '../opfs.ts'
import type { CommitReviewRecord } from '../records.ts'
import { idbPutRecord } from '../tx.ts'

// todo atomicity
export async function saveRepoCommitReview(
    db: IDBDatabase,
    commit: RepoCommitInputs,
): Promise<RepoCommitReview> {
    const id = ulid()
    if (commit.additions) {
        await writeAdditionsToOpfs(id, commit.repo, commit.additions)
    }
    await idbPutRecord<CommitReviewRecord>(
        db,
        DB_STORE_COMMIT_REVIEW,
        createRecord(id, commit),
    )
    return { id, commit }
}

function createRecord(
    reviewId: string,
    commit: RepoCommitInputs,
): CommitReviewRecord {
    return {
        reviewId,
        nameWithOwner: joinRepoName(commit.repo),
        commitMessage: commit.commitMessage,
        branch: commit.branch,
        additions:
            commit.additions?.map(addition => ({
                dirpath: addition.dirpath,
                filename: addition.filename,
            })) ?? null,
        deletions: commit.deletions ?? null,
    }
}

async function writeAdditionsToOpfs(
    reviewId: string,
    repo: RepositoryId,
    additions: Array<RepoCommitAddition>,
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

// todo call from diff ui resync required before review approval
// export async function updateCommitReviewRecordHeadOid(
//     reviewId: string,
//     headOid: string,
// ) {
//     const db = await connectToDb()
//     await new Promise<void>((res, rej) => {
//         const tx = db.transaction([DB_STORE_COMMIT_REVIEW], 'readwrite')
//         const objectStore = tx.objectStore(DB_STORE_COMMIT_REVIEW)
//         const request: IDBRequest<CommitReviewRecord> =
//             objectStore.get(reviewId)
//         request.onsuccess = () => {
//             request.result.branch.headOid = headOid
//             objectStore.put(request.result)
//             tx.commit()
//         }

//         tx.oncomplete = () => res()

//         tx.onerror = e => {
//             console.error('db error', e)
//             rej(e)
//         }
//     })
// }
