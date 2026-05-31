import {
    registerSyncedRefJob,
    type SyncedRefs,
} from '@sidelines/jobs/workers/syncedRefs'

registerSyncedRefJob({ forSyncedRefs: syncWatches })

async function syncWatches(
    _ghToken: string,
    _syncedRef: SyncedRefs,
): Promise<void> {}
