export type RepoLatestTagsVars = {
    owner: string
    name: string
    tags?: number
}

export const RepoLatestTags: string =
    'query RepoLatestTags($owner: String!, $name: String!, $tags: Int = 10) { repository(owner: $owner, name: $name) { refs( refPrefix: "refs/tags/" first: $tags orderBy: { field: TAG_COMMIT_DATE, direction: DESC } ) { edges { node { name } } } } }'
