import {
    doesSidelinesRepoExist,
    getAppInstallation,
    UnauthorizedError,
} from '@sidelines/github'
import { useEffect, useState, type FC } from 'react'
import { createRoot } from 'react-dom/client'
import { MakeNotesRepo } from './MakeNotesRepo.tsx'
import { ChooseWorkflow } from './workflow/ChooseWorkflow.tsx'
import { expectGhLogin, expectGhToken } from '../init.ts'
import { getAppInstallationConfigureUrl, getAppUrl, logout } from '../nav.ts'

// todo hard-coded value should be a build env variable or globalThis
const GH_APP_ID = location.host === 'sidelines.dev' ? 1166711 : 1144785

type AppState =
    | 'loading'
    | 'api-error'
    | 'not-installed'
    | 'not-all-repos'
    | 'no-notes-repo'
    | 'all-good'

interface ConfigurePageProps {
    ghToken: string
    ghLogin: string
}

// todo provide alternatives to repositorySelection === all
//  `gh repo create --template eighty4/.sidelines.templates` with .sidelines as an installed repository
const Configure: FC<ConfigurePageProps> = ({ ghToken, ghLogin }) => {
    const [installationId, setInstallationId] = useState<number | undefined>()
    const [appState, setAppState] = useState<AppState>('loading')
    useEffect(() => {
        getAppInstallation(ghToken, GH_APP_ID)
            .then(async installation => {
                if (!installation) {
                    return 'not-installed'
                } else {
                    setInstallationId(installation.installationId)
                    if (installation.repositorySelection !== 'all') {
                        return 'not-all-repos'
                    } else if (!(await doesSidelinesRepoExist(ghToken))) {
                        return 'no-notes-repo'
                    }
                }
                return 'all-good'
            })
            .then(setAppState)
            .catch(err => {
                console.error(err)
                setAppState('api-error')
            })
    }, [])

    switch (appState) {
        case 'loading':
            return <p></p>
        case 'not-installed':
            return (
                <p>
                    <a href={getAppUrl()}>Install the GitHub app</a>
                </p>
            )
        case 'not-all-repos':
            return (
                <p>
                    <a href={getAppInstallationConfigureUrl(installationId!)}>
                        Configure the GitHub app for all repositories
                    </a>
                </p>
            )
        case 'no-notes-repo':
            return (
                <MakeNotesRepo
                    ghToken={ghToken}
                    ghLogin={ghLogin}
                    onRepoMade={() => setAppState('all-good')}
                />
            )
        case 'api-error':
            return <p>Api error</p>
        case 'all-good':
            return <ChooseWorkflow ghToken={ghToken} ghLogin={ghLogin} />
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const ghToken = expectGhToken()
        const ghLogin = await expectGhLogin(ghToken)
        createRoot(document.getElementById('root')!).render(
            <Configure ghToken={ghToken} ghLogin={ghLogin} />,
        )
    } catch (e) {
        if (e instanceof UnauthorizedError) {
            logout()
            return
        } else {
            throw e
        }
    }
})
