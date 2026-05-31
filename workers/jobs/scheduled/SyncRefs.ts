// import { getReposWithWatches } from '@sidelines/data/tx/readWatches'
// import { syncRefs } from '@sidelines/data/tx/syncRefs'
// import { queryMultipleRepoHeadOids } from '@sidelines/github/repositories/queryMultipleRepoHeadOids'
import { registerScheduledJob } from '@sidelines/jobs/workers/scheduled'

registerScheduledJob({
    onSchedule: sync,
})

async function sync(_ghToken: string) {
    // const watchedRepos = await getReposWithWatches()
    // todo queryMultipleRepoHeadOids does not imply all viewer repos + input repos
    // const headRefs = await queryMultipleRepoHeadOids(ghToken, watchedRepos)
    // todo DB_STORE_REPO_SYNCING needs to be changed to
    // const _syncedRefs = await syncRefs(headRefs)
    // todo need api for a job to invoke a child job
    // todo if
    // for (const workerId of [
    //     'SYNC_packages',
    //     'SYNC_watches',
    // ] satisfies Array<`SYNC_${string}`>) {
    //     workerLaunch!.request(workerId, {
    //         kind: 'sync',
    //         ghToken,
    //         syncedRefs,
    //     } satisfies SyncRefsEvent)
    // }
}
