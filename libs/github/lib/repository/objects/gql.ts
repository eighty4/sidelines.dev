export type QueryRepoObjectsVars = {
    owner: string
    name: string
    objExpr: string
}

export const QueryRepoObjects: string =
    'query QueryRepoObjects($owner: String!, $name: String!, $objExpr: String!) { repository(owner: $owner, name: $name) { object(expression: $objExpr) { __typename ... on Blob { byteSize isBinary } ... on Tree { entries { name type object { ... on Blob { byteSize isBinary } } } } } } }'

export type RepoDirListingVars = {
    owner: string
    name: string
    objExpr: string
}

export const RepoDirListing: string =
    'query RepoDirListing($owner: String!, $name: String!, $objExpr: String!) { repository(owner: $owner, name: $name) { object(expression: $objExpr) { ... on Tree { entries { name type object { ... on Blob { byteSize } } } } } } }'

export type ViewerRepoDirContentVars = {
    name: string
    objExpr: string
}

export const ViewerRepoDirContent: string =
    'query ViewerRepoDirContent($name: String!, $objExpr: String!) { viewer { repository(name: $name) { object(expression: $objExpr) { ... on Tree { entries { name type object { ... on Blob { byteSize text } } } } } } } }'

export type ViewerRepoObjectHistoryVars = {
    repo: string
    branch: string
    path: string
    pageSize: number
    cursor: string
}

export const ViewerRepoObjectHistory: string =
    'query ViewerRepoObjectHistory( $repo: String! $branch: String! $path: String! $pageSize: Int! $cursor: String! ) { viewer { repository(name: $repo) { ref(qualifiedName: $branch) { target { ... on Commit { history(first: $pageSize, path: $path, after: $cursor) { nodes { oid author { name } message authoredDate } pageInfo { hasNextPage endCursor } totalCount } } } } } } }'
