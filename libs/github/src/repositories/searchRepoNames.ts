import { queryGraphqlApi } from '../request.ts'

export interface SearchRepoNamesResult {
    term: string
    matches: Array<string>
}

export async function searchRepoNames(
    ghToken: string,
    owner: string,
    term: string,
): Promise<SearchRepoNamesResult> {
    const query = `{ search(query: "user:${owner} in:name ${term}", type: REPOSITORY, first: 5) { nodes { ... on Repository { name }}}}`
    const json = await queryGraphqlApi(ghToken, query, null)
    return {
        term,
        matches: json.data.search.nodes.length
            ? json.data.search.nodes.map(
                  (datum: { name: string }) => datum.name,
              )
            : [],
    }
}
