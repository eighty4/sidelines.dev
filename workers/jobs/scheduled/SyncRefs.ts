import { connectToDb } from '@sidelines/data/indexeddb'
import { getReposWithWatches } from '@sidelines/data/tx/readWatches'
import { syncRefs, type SyncRefsInput } from '@sidelines/data/tx/syncRefs'
import { queryViewerAndExplicitRepoHeadOids } from '@sidelines/github/repositories/queryViewerAndExplicitRepoHeadOids'
import {
    registerScheduledJob,
    type ScheduledJobExecContext,
} from '@sidelines/jobs/workers/scheduled'
import type { AvailableJobCriterion, RepoNameWithOwner } from '@sidelines/model'

registerScheduledJob({ onSchedule: sync })

async function sync({ ghToken }: ScheduledJobExecContext) {
    const db = await connectToDb()
    const watchedRepos = await getReposWithWatches(db)
    const repoHeads = await queryViewerAndExplicitRepoHeadOids(
        ghToken,
        Array.from(watchedRepos),
    )
    const syncRefsInputs: Record<RepoNameWithOwner, SyncRefsInput> =
        Object.fromEntries(
            Object.entries(repoHeads).map(([repo, defaultBranch]) => {
                return [
                    repo,
                    {
                        repo: repo as RepoNameWithOwner,
                        defaultBranch,
                        criteria: syncedRefsJobCriteria(
                            repo as RepoNameWithOwner,
                            watchedRepos,
                        ),
                    } satisfies SyncRefsInput,
                ]
            }),
        )
    await syncRefs(db, syncRefsInputs)
    db.close()
}

function syncedRefsJobCriteria(
    repo: RepoNameWithOwner,
    watchedRepos: Set<RepoNameWithOwner>,
): Set<AvailableJobCriterion> {
    return watchedRepos.has(repo) ? new Set(['watch']) : new Set()
}
