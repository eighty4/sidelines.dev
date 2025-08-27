import { restGetJson } from '../request.ts'

export interface SidelinesAppInstallation {
    installationId: number
    repositorySelection: 'all' | 'selected'
}

type _GHAppInstallations = {
    installations: Array<{
        id: number
        app_id: number
        repository_selection: 'all' | 'selected'
    }>
}

export async function getAppInstallation(
    ghToken: string,
    appId: number,
): Promise<SidelinesAppInstallation | null> {
    const json: _GHAppInstallations = await restGetJson(
        ghToken,
        'https://api.github.com/user/installations',
    )
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
    return null
}
