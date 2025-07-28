import { UserDataClient } from '@sidelines/data/web'
import { UnauthorizedError } from '@sidelines/github'
import type { RepositoryId } from '@sidelines/model'
import { type FC, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { FileExplorer } from './FileExplorer.tsx'
import { RepoSources } from './RepoSources.ts'
import { WorkspaceEditor } from './editor/WorkspaceEditor.tsx'
import { ProjectNavbar } from './navbar/ProjectNavbar.tsx'
import { expectUserDataClient } from '../init.ts'
import { logout } from '../nav.ts'

type ProjectPageProps = {
    repo: RepositoryId
    userData: UserDataClient
}

const ProjectPage: FC<ProjectPageProps> = ({ repo, userData }) => {
    const sources = useMemo(() => new RepoSources(repo, userData), [])
    return (
        <div id="project">
            <ProjectNavbar repo={repo} userData={userData} />
            <div id="project-workspace">
                <div id="file-ls">
                    <FileExplorer
                        ghLogin={userData.ghLogin}
                        repo={repo}
                        sources={sources}
                    />
                </div>
                <WorkspaceEditor
                    ghToken={userData.ghToken}
                    ghLogin={userData.ghLogin}
                    repo={repo}
                    sources={sources}
                />
            </div>
        </div>
    )
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const userData = await expectUserDataClient()
        const repo = getRepoFromLocation(userData.ghLogin)
        userData.navVisit(repo)
        createRoot(document.getElementById('root')!).render(
            <ProjectPage repo={repo} userData={userData} />,
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

function getRepoFromLocation(ghLogin: string): RepositoryId {
    const { searchParams } = new URL(location.href)
    const owner = searchParams.get('owner')
    const name = searchParams.get('name')
    if (owner === null || name === null || owner !== ghLogin) {
        throw new UnauthorizedError(`${owner} != ${ghLogin}`)
    }
    return { owner, name }
}
