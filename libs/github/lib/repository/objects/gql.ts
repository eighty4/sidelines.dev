export type QueryRepoObjectsVars = {
    owner: string
    name: string
    objExpr: string
}

export const QueryRepoObjects: string =
    'query QueryRepoObjects($owner: String!, $name: String!, $objExpr: String!) { repository(owner: $owner, name: $name) { object(expression: $objExpr) { __typename ... on Blob { byteSize isBinary } ... on Tree { entries { name type object { ... on Blob { byteSize isBinary } } } } } } }'
