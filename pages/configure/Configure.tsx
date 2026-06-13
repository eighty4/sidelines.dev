import { UnauthorizedError } from '@sidelines/github'
import { getAppInstallation } from '@sidelines/github/app/getAppInstallation'
import {
    checkSidelinesRepo,
    type SidelinesRepoProblem,
} from '@sidelines/github/sidelines/repository/checkSidelinesRepo'
import { expectGhToken } from '@sidelines/pageload/session'
import { onDomInteractive } from '@sidelines/pageload/ready'
import { useEffect, useState, type FC } from 'react'
import { createRoot } from 'react-dom/client'
import { getAppInstallationConfigureUrl, getAppUrl, logout } from '../nav.ts'
import { MakeSidelinesRepo } from './MakeSidelinesRepo.tsx'

// todo hard-coded value should be a build env variable or globalThis
const GH_APP_ID = location.host === 'sidelines.dev' ? 1166711 : 1144785

type ConfigureState =
    | 'loading'
    | 'api-error'
    | 'app-not-installed'
    | 'app-not-all-repos'
    | 'repo-missing'
    | `repo-misconfigured`
    | 'all-good'

type ConfigurePageProps = {
    ghToken: string
}

// todo provide alternatives to repositorySelection === all
//  `gh repo create --template eighty4/.sidelines.template` with .sidelines as an installed repository
const Configure: FC<ConfigurePageProps> = ({ ghToken }) => {
    const [installationId, setInstallationId] = useState<number | undefined>()
    const [appState, setConfigureState] = useState<ConfigureState>('loading')
    const [repoProblems, setRepoProblems] =
        useState<Set<SidelinesRepoProblem> | null>(null)

    useEffect(() => {
        getAppInstallation(ghToken, GH_APP_ID)
            .then(async installation => {
                if (!installation) {
                    return 'app-not-installed'
                } else {
                    setInstallationId(installation.installationId)
                    if (installation.repositorySelection !== 'all') {
                        return 'app-not-all-repos'
                    }
                    const sidelinesRepo = await checkSidelinesRepo(ghToken)
                    switch (sidelinesRepo) {
                        case true:
                            location.assign('/gameplan')
                            return 'all-good'
                        case false:
                            return 'repo-missing'
                        default:
                            setRepoProblems(sidelinesRepo)
                            return 'repo-misconfigured'
                    }
                }
            })
            .then(setConfigureState)
            .catch(err => {
                console.error(err)
                setConfigureState('api-error')
            })
    }, [])

    switch (appState) {
        case 'loading':
            return <p></p>
        case 'app-not-installed':
            return (
                <p>
                    <a href={getAppUrl()}>Install the GitHub app</a>
                </p>
            )
        case 'app-not-all-repos':
            return (
                <p>
                    <a href={getAppInstallationConfigureUrl(installationId!)}>
                        Configure the GitHub app for all repositories
                    </a>
                </p>
            )
        case 'repo-missing':
            return (
                <MakeSidelinesRepo
                    ghToken={ghToken}
                    onRepoMade={() => setConfigureState('all-good')}
                />
            )
        case 'repo-misconfigured':
            return (
                <>
                    <p>
                        Sidelines.dev needs your GitHub account's .sidelines
                        repo settings to match how we would have created the
                        repo. This ensures your data is safe and private!
                    </p>
                    {repoProblems!.has('not-private') && (
                        <>
                            <p>
                                Your .sidelines repo{' '}
                                <strong>IS NOT PRIVATE!!!</strong>.
                            </p>
                            <p>Fix this immediately!</p>
                        </>
                    )}
                    {repoProblems!.has('bad-url') && (
                        <p>
                            Make sure your .sidelines repo has its homepageUrl
                            set to https://sidelines.dev so we know it's not
                            clashing with a repository coincidentally with the
                            same name.
                        </p>
                    )}
                </>
            )
        case 'api-error':
            return <p>Api error</p>
    }
}

onDomInteractive(async () => {
    try {
        const ghToken = expectGhToken()
        createRoot(document.getElementById('root')!).render(
            <Configure ghToken={ghToken} />,
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
