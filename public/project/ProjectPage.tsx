import { type RepositoryId, UserDataClient } from '@sidelines/data/web'
import { UnauthorizedError } from '@sidelines/github'
import type { FC } from 'react'
import { createRoot } from 'react-dom/client'
import { ProjectNavbar } from './navbar/ProjectNavbar.tsx'
import { ProjectWorkspace } from './workspace/ProjectWorkspace.tsx'
import { expectUserDataClient } from '../init.js'
import { logout } from '../nav.js'

function getRepoFromLocation(ghLogin: string): RepositoryId {
    const { searchParams } = new URL(location.href)
    const owner = searchParams.get('owner')
    const name = searchParams.get('name')
    if (owner === null || name === null || owner !== ghLogin) {
        throw new UnauthorizedError(`${owner} != ${ghLogin}`)
    }
    return { owner, name }
}

interface ProjectPageProps {
    repo: RepositoryId
    userData: UserDataClient
}

const ProjectPage: FC<ProjectPageProps> = ({ repo, userData }) => {
    return (
        <div id="project">
            <ProjectNavbar repo={repo} userData={userData} />
            <ProjectWorkspace
                ghToken={userData.ghToken}
                ghLogin={userData.ghLogin}
                repo={repo}
            />
        </div>
    )
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const userData = await expectUserDataClient()
        const repo = getRepoFromLocation(userData.ghLogin)
        userData.postNavVisit(repo)
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
