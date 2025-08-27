export type ViewerRepoExistsVars = {
    repo: string
}

export const ViewerRepoExists: string =
    'query ViewerRepoExists($repo: String!) { viewer { repository(name: $repo) { nameWithOwner } } }'
