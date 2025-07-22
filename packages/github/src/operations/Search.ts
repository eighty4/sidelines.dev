import { onUnauthorized } from '../responses.ts'

export type SearchQuery = {
    kind?: 'in:file' | 'in:path' | 'in:file,path'
    qualifiers: Array<SearchQualifier>
    term: string
}

export type SearchQualifier = {
    type: 'extension' | 'filename' | 'path' | 'user'
    term: string
}

export type SearchResults = Array<{
    filename: string
    path: string
    repo: string
    owner: string
}>

// todo figure out why there is such a tighter cap on gh tokens doing search
export async function search(
    ghToken: string,
    { kind = 'in:file', term, qualifiers }: SearchQuery,
): Promise<SearchResults> {
    const q = `${term} ${qualifiers.map(qual => `${qual.type}:${qual.term}`).join(' ')} ${kind}`
    const url = 'https://api.github.com/search/code?q=' + encodeURIComponent(q)
    const response = await fetch(url, {
        headers: {
            Authorization: 'Bearer ' + ghToken,
        },
    })
    if (response.status === 401) {
        onUnauthorized()
    }
    if (response.status === 403) {
        if (response.headers.get('x-ratelimit-remaining') === '0') {
            throw new Error('api rate limit reached')
        } else {
            throw new Error('forbidden')
        }
    }
    const searchResponse: SearchResponse = await response.json()
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
