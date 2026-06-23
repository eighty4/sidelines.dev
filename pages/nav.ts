import type { RepositoryId } from '@sidelines/model'

export function buildProjectUrl(repo: RepositoryId): string {
    return `/${repo.owner}/${repo.name}`
}

export const loginRedirectUrl = '/github/redirect/user/login'

export function getAppUrl(): string {
    const appName =
        location.host === 'sidelines.dev'
            ? 'sidelines-dev'
            : 'sidelines-dev-dev'
    return 'https://github.com/apps/' + appName
}

export function getAppInstallationConfigureUrl(installationId: number): string {
    return `https://github.com/settings/installations/${installationId}`
}

export function logout() {
    const form = createLogoutForm()
    document.body.append(form)
    form.submit()
}

function createLogoutForm(): HTMLFormElement {
    const form = document.createElement('form')
    form.action = '/logout'
    form.method = 'POST'
    return form
}

export function createLogoutButton(): HTMLFormElement {
    const form = createLogoutForm()
    const button = document.createElement('button')
    button.type = 'submit'
    button.innerText = 'Logout'
    form.appendChild(button)
    return form
}

export function navToProject(repo: RepositoryId) {
    location.assign(buildProjectUrl(repo))
}
