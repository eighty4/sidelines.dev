import { UnauthorizedError } from '@sidelines/github'
import type { RepositoryId } from '@sidelines/model'

export function expectRepoFromLocation(expectGhLogin?: string): RepositoryId {
    let useSearchParams = false
    const url = new URL(location.href)
    switch (url.pathname) {
        case '/project':
        case '/project/notes':
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
