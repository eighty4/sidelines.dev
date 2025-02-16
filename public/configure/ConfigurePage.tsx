import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { doesNotesRepoExist, getAppInstallation, getAppUrl, getAppInstallationConfigureUrl } from '@eighty4/sidelines-github'
import { ChooseProject } from './ChooseProject.tsx'
import { MakeNotesRepo } from './MakeNotesRepo.tsx'
import { getCookie } from '../../cookie.ts'

type AppState = 'loading' | 'api-error' | 'not-installed' | 'not-all-repos' | 'no-notes-repo' | 'all-good'

const ConfigurePage = () => {
  const ghToken = getCookie(document.cookie, 'ght')!
  const [installationId, setInstallationId] = useState<number | undefined>()
  const [appState, setAppState] = useState<AppState>('loading')
  useEffect(() => {
    getAppInstallation(ghToken, 1144785)
      .then(async installation => {
        if (!installation) {
          return 'not-installed'
        } else {
          setInstallationId(installation.installationId)
          if (installation.repositorySelection !== 'all') {
            return 'not-all-repos'
          } else if (!(await doesNotesRepoExist(ghToken))) {
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
      return <p><a href={getAppUrl()}>Install the GitHub app</a></p>
    case 'not-all-repos':
      return <p><a href={getAppInstallationConfigureUrl(installationId!)}>Configure the GitHub app for all repositories</a></p>
    case 'no-notes-repo':
      return <MakeNotesRepo ghToken={ghToken} onRepoMade={() => setAppState('all-good')} />
    case 'api-error':
      return <p>Api error</p>
    case 'all-good':
      return <ChooseProject ghToken={ghToken} onProjectChoice={(repo) => {
        // @ts-ignore
        location = '/project?name=' + repo
      }} />
  }
}

document.addEventListener('DOMContentLoaded', () => {
  createRoot(document.getElementById("root")!).render(<ConfigurePage />)
})
