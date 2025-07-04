import {
    doesSidelinesRepoExist,
    getAppInstallation,
    getAppInstallationConfigureUrl,
    getAppUrl,
    getUserLogin,
} from '@eighty4/sidelines-github'
import { useEffect, useState, type FC } from 'react'
import { createRoot } from 'react-dom/client'
import { expectGhToken, ghLoginCache } from '../storage.ts'
import { ChooseProject } from './ChooseProject.tsx'
import { MakeNotesRepo } from './MakeNotesRepo.tsx'

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
}

// todo provide alternatives to repositorySelection === all
//  `gh repo create --template eighty4/.sidelines.templates` with .sidelines as an installed repository
const ConfigurePage: FC<ConfigurePageProps> = ({ ghToken }) => {
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
            return <p>Loading...</p>
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
                    onRepoMade={() => setAppState('all-good')}
                />
            )
        case 'api-error':
            return <p>Api error</p>
        case 'all-good':
            return (
                <ChooseProject
                    ghToken={ghToken}
                    onProjectChoice={repo => {
                        location.assign('/project?name=' + repo)
                    }}
                />
            )
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const ghToken = expectGhToken()
    await ghLoginCache.readThrough(() => getUserLogin(ghToken))
    createRoot(document.getElementById('root')!).render(
        <ConfigurePage ghToken={ghToken} />,
    )
})
