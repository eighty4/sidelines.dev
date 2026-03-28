export type QRepoObjectVars = {
    owner: string
    name: string
    objExpr: string
}

export const QRepoObject: string =
    'query QRepoObject($owner: String!, $name: String!, $objExpr: String!) { repository(owner: $owner, name: $name) { object(expression: $objExpr) { __typename ... on Blob { byteSize isBinary } ... on Tree { entries { name type object { ... on Blob { byteSize isBinary } } } } } } }'

export type QRepoObjectContentVars = {
    owner: string
    name: string
    objExpr: string
}

export const QRepoObjectContent: string =
    'query QRepoObjectContent($owner: String!, $name: String!, $objExpr: String!) { repository(owner: $owner, name: $name) { object(expression: $objExpr) { ... on Blob { text } } } }'

export type QRepoDirListingVars = {
    owner: string
    name: string
    objExpr: string
}

export const QRepoDirListing: string =
    'query QRepoDirListing($owner: String!, $name: String!, $objExpr: String!) { repository(owner: $owner, name: $name) { object(expression: $objExpr) { ... on Tree { entries { name type object { ... on Blob { byteSize } } } } } } }'

export type QViewerRepoDirContentVars = {
    name: string
    objExpr: string
}

export const QViewerRepoDirContent: string =
    'query QViewerRepoDirContent($name: String!, $objExpr: String!) { viewer { repository(name: $name) { object(expression: $objExpr) { ... on Tree { entries { name type object { ... on Blob { byteSize text } } } } } } } }'

export type QViewerRepoObjectHistoryVars = {
    repo: string
    branch: string
    path: string
    pageSize: number
    cursor: string
}

export const QViewerRepoObjectHistory: string =
    'query QViewerRepoObjectHistory( $repo: String! $branch: String! $path: String! $pageSize: Int! $cursor: String! ) { viewer { repository(name: $repo) { ref(qualifiedName: $branch) { target { ... on Commit { history(first: $pageSize, path: $path, after: $cursor) { nodes { oid author { name } message authoredDate } pageInfo { hasNextPage endCursor } totalCount } } } } } } }'
