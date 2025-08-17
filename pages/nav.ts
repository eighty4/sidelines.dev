import type { RepositoryId } from '@sidelines/model'

export function buildProjectUrl(repo: RepositoryId): string {
    return `/${repo.owner}/${repo.name}`
}

export const loginRedirectUrl = '/github/redirect/user/login'

export const logoutRedirectUrl = '/logout'

export function getAppUrl(): string {
    return 'https://github.com/apps/sidelines-dev'
}

export function getAppInstallationConfigureUrl(installationId: number): string {
    return `https://github.com/settings/installations/${installationId}`
}

export function logout() {
    location.assign(logoutRedirectUrl)
}

export function navToProject(repo: RepositoryId) {
    location.assign(buildProjectUrl(repo))
}
