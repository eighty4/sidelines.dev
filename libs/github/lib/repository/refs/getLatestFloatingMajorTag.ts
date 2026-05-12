import type { RepositoryId } from '@sidelines/model'
import { findLatestFloatingMajorTag } from './floatingMajorTag.api.ts'
import { getLatestTags } from './getLatestTags.ts'

// returns the highest `v6`-style git tag
export async function getLatestFloatingMajorTag(
    ghToken: string,
    repo: RepositoryId,
): Promise<string | null> {
    return findLatestFloatingMajorTag(await getLatestTags(ghToken, repo))
}
