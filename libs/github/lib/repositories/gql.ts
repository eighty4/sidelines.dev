export type ViewerReposNamesVars = {
    pageSize: number
    cursor: string
}

export const ViewerReposNames: string =
    'query ViewerReposNames($pageSize: Int!, $cursor: String!) { viewer { repositories(affiliations: [OWNER], first: $pageSize, after: $cursor) { nodes { ... on Repository { name } } pageInfo { endCursor hasNextPage } } } }'

export type ViewerReposActivityDataVars = {
    pageSize: number
    cursor: string
}

export const ViewerReposActivityData: string =
    'query ViewerReposActivityData($pageSize: Int!, $cursor: String!) { viewer { repositories(first: $pageSize, after: $cursor, affiliations: [OWNER]) { nodes { ... on Repository { name stargazerCount updatedAt } } pageInfo { endCursor hasNextPage } } } }'
