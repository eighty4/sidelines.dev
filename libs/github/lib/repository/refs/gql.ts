export type QRepoLatestTagsVars = {
    owner: string
    name: string
    refQuery?: string
    tags?: number
}

export const QRepoLatestTags: string =
    'query QRepoLatestTags( $owner: String! $name: String! $refQuery: String = "" $tags: Int = 10 ) { repository(owner: $owner, name: $name) { refs( query: $refQuery refPrefix: "refs/tags/" first: $tags orderBy: { field: TAG_COMMIT_DATE, direction: DESC } ) { edges { node { name } } } } }'
