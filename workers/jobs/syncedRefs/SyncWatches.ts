import {
    registerSyncedRefJob,
    type SyncedRefsJobInput,
} from '@sidelines/jobs/workers/syncedRefs'

registerSyncedRefJob({ forSyncedRefs: syncWatches })

async function syncWatches(
    _ghToken: string,
    _syncedRef: SyncedRefsJobInput,
): Promise<void> {}
