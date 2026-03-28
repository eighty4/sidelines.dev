export type QViewerRepoExistsVars = {
    repo: string
}

export const QViewerRepoExists: string =
    'query QViewerRepoExists($repo: String!) { viewer { repository(name: $repo) { nameWithOwner } } }'

export type QRepoDefaultBranchVars = {
    owner: string
    name: string
}

export const QRepoDefaultBranch: string =
    'query QRepoDefaultBranch($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { defaultBranchRef { name target { ... on Commit { history(first: 1) { edges { node { ... on Commit { committedDate oid } } } } } } } } }'

export type QViewerRepoDefaultBranchVars = {
    repo: string
}

export const QViewerRepoDefaultBranch: string =
    'query QViewerRepoDefaultBranch($repo: String!) { viewer { repository(name: $repo) { defaultBranchRef { name target { ... on Commit { history(first: 1) { edges { node { ... on Commit { committedDate oid } } } } } } } } } }'
