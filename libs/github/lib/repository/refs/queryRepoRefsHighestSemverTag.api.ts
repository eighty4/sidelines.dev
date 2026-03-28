import type { RepositoryId } from '@sidelines/model'
import { prerelease, sort } from 'semver'
import { getLatestTags } from './getLatestTags.ts'

export default async function queryRepoRefsHighestSemverTag(
    ghToken: string,
    repo: RepositoryId,
    tagPrefix?: string,
): Promise<string | null> {
    const tags = await getLatestTags(ghToken, repo, tagPrefix || 'v')
    return sort(tags).find(tag => !prerelease(tag)) || null
}
