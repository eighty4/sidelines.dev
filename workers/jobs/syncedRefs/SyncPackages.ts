import { updateRepoPackages } from '@sidelines/data/tx/repoPackages'
import {
    registerSyncedRefJob,
    type SyncedRefs,
} from '@sidelines/jobs/workers/syncedRefs'

registerSyncedRefJob({ forSyncedRefs: syncPackages })

async function syncPackages(
    ghToken: string,
    syncedRef: SyncedRefs,
): Promise<void> {
    await updateRepoPackages(ghToken, syncedRef.repo, syncedRef.defaultBranch)
}
