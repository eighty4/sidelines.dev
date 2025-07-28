import type { RepositoryId } from '@sidelines/model'

export function buildProjectUrl(repo: RepositoryId): string {
    return `/project?owner=${repo.owner}&name=${repo.name}`
}

export function logout() {
    location.assign('/logout')
}

export function navToProject(repo: RepositoryId) {
    location.assign(buildProjectUrl(repo))
}
