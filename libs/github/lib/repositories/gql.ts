export type QViewerReposNamesVars = {
    pageSize: number
    cursor: string
}

export const QViewerReposNames: string =
    'query QViewerReposNames($pageSize: Int!, $cursor: String!) { viewer { repositories(affiliations: [OWNER], first: $pageSize, after: $cursor) { nodes { ... on Repository { name } } pageInfo { endCursor hasNextPage } } } }'

export type QViewerReposActivityDataVars = {
    pageSize: number
    cursor: string
}

export const QViewerReposActivityData: string =
    'query QViewerReposActivityData($pageSize: Int!, $cursor: String!) { viewer { repositories(first: $pageSize, after: $cursor, affiliations: [OWNER]) { nodes { ... on Repository { name stargazerCount updatedAt } } pageInfo { endCursor hasNextPage } } } }'
