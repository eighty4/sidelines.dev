import { UnauthorizedError } from '@sidelines/github'
import type { RepositoryId } from '@sidelines/model'

export function buildProjectUrl(repo: RepositoryId): string {
    return `/${repo.owner}/${repo.name}`
}

export function logout() {
    location.assign('/logout')
}

export function navToProject(repo: RepositoryId) {
    location.assign(buildProjectUrl(repo))
}

export function expectRepoFromLocation(expectGhLogin?: string): RepositoryId {
    let useSearchParams = false
    const url = new URL(location.href)
    switch (url.pathname) {
        case '/notes':
        case '/project':
            useSearchParams = true
    }
    const repo = useSearchParams
        ? repoFromSearchParams(url.searchParams)
        : repoFromPathname(url.pathname)
    if (expectGhLogin && expectGhLogin !== repo.owner) {
        throw new UnauthorizedError(`${repo.owner} != ${expectGhLogin}`)
    }
    return repo
}

function repoFromPathname(pathname: string): RepositoryId {
    const [owner, name] = pathname.substring(1).split('/')
    return { owner, name }
}

function repoFromSearchParams(searchParams: URLSearchParams): RepositoryId {
    const owner = searchParams.get('owner')
    const name = searchParams.get('name')
    if (owner === null || name === null) {
        throw new UnauthorizedError('must use ?owner=XXX&name=XXX')
    }
    return { owner, name }
}
