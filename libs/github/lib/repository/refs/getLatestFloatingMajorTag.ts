import type { RepositoryId } from '@sidelines/model'
import { getLatestTags } from './getLatestTags.ts'
import { findLatestFloatingMajorTag } from './_findLatestFloatingMajorTag.ts'

// returns the highest `v6`-style git tag
export async function getLatestFloatingMajorTag(
    ghToken: string,
    repo: RepositoryId,
): Promise<string | null> {
    return findLatestFloatingMajorTag(await getLatestTags(ghToken, repo))
}
