import { onUnauthorized } from '../responses.ts'

export function getAppUrl(): string {
    return 'https://github.com/apps/sidelines-dev'
}

export function getAppInstallationConfigureUrl(installationId: number): string {
    return `https://github.com/settings/installations/${installationId}`
}

export interface SidelinesAppInstallation {
    installationId: number
    repositorySelection: 'all' | 'selected'
}

export async function getAppInstallation(
    ghToken: string,
    appId: number,
): Promise<SidelinesAppInstallation | undefined> {
    const response = await fetch('https://api.github.com/user/installations', {
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: 'Bearer ' + ghToken,
            'X-GitHub-Api-Version': '2022-11-28',
        },
    })
    if (response.status === 401) {
        onUnauthorized()
    }
    const json: {
        installations: Array<{
            id: number
            app_id: number
            repository_selection: 'all' | 'selected'
        }>
    } = await response.json()
    if (json.installations.length) {
        const found = json.installations.find(
            installation => installation.app_id === appId,
        )
        if (found) {
            return {
                installationId: found.id,
                repositorySelection: found.repository_selection,
            }
        }
    }
}
