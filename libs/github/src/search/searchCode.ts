import { restGetJson } from '../request.ts'

export type SearchQuery = {
    kind?: 'in:file' | 'in:path' | 'in:file,path'
    qualifiers: Array<SearchQualifier>
    term: string
}

export type SearchQualifier = {
    type:
        | 'extension'
        | 'filename'
        | 'language'
        | 'org'
        | 'path'
        | 'repo'
        | 'size'
        | 'user'
    term: string
}

export type SearchResults = Array<{
    filename: string
    path: string
    repo: string
    owner: string
}>

// https://docs.github.com/en/rest/search/search
// https://docs.github.com/en/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax
// https://docs.github.com/en/search-github/searching-on-github/searching-code
//
// legacy search via /search/code will only have access to actively developed projects
// until after ~12 months of inactivity a repository's code will be de-indexed
// this makes it great searching across all of a user's repos because the results will
// focus on repository's actively/recently relevant to the user
//
// caveat: qualifier `repo` for a de-indexed repository returns an empty array
// without an indicator whether the repository lacks search indexing or lacks content
// matching your search
export async function searchCode(
    ghToken: string,
    { kind = 'in:file', term, qualifiers }: SearchQuery,
): Promise<SearchResults> {
    const q = `${term} ${qualifiers.map(qual => `${qual.type}:${qual.term}`).join(' ')} ${kind}`
    const url = 'https://api.github.com/search/code?q=' + encodeURIComponent(q)
    const searchResponse: SearchResponse = await restGetJson(ghToken, url)
    return searchResponse.items.map(item => ({
        filename: item.name,
        path: item.path,
        repo: item.repository.name,
        owner: item.repository.owner.login,
    }))
}

type SearchResponse = {
    total_count: number
    incomplete_results: boolean
    items: Array<{
        name: string
        path: string
        sha: string
        url: string
        git_url: string
        html_url: string
        repository: {
            id: number
            node_id: string
            name: string
            full_name: string
            owner: {
                login: string
                id: number
                node_id: string
                avatar_url: string
                gravatar_url: string
                url: string
                html_url: string
                followers_url: string
                following_url: string
                gists_url: string
                starred_url: string
                subscriptions_url: string
                organizations_url: string
                repos_url: string
                events_url: string
                received_events_url: string
                type: string
                site_admin: boolean
            }
        }
    }>
}
