import { connectToDb } from '@sidelines/data/indexeddb'
import { updateRepoPackages } from '@sidelines/data/tx/repoPackages'
import {
    registerSyncedRefJob,
    type SyncedRefsJobInput,
} from '@sidelines/jobs/workers/syncedRefs'

registerSyncedRefJob({ forSyncedRefs: syncPackages })

async function syncPackages(
    ghToken: string,
    syncedRef: SyncedRefsJobInput,
): Promise<void> {
    console.log('updating repo packages in indexeddb')
    const db = await connectToDb()
    await updateRepoPackages(db, ghToken, syncedRef.repo, syncedRef.to)
    db.close()
    console.log('updated repo packages in indexeddb')
}
