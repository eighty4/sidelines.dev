import type { UserDataClient } from '@sidelines/data/web'
import type { RepositoryId } from '@sidelines/model'
import { type FC } from 'react'
import { RecentNav } from './RecentNav.tsx'
import { SearchInput } from './SearchInput.tsx'

interface ProjectNavbarProps {
    repo: RepositoryId
    userData: UserDataClient
}

export const ProjectNavbar: FC<ProjectNavbarProps> = ({ repo, userData }) => {
    return (
        <div id="project-nav">
            <div id="project-nav-dashboard">{repo.name}</div>
            <RecentNav currentPageProject={repo} userData={userData} />
            <SearchInput
                currentPageProject={repo}
                ghToken={userData.ghToken}
                ghLogin={userData.ghLogin}
            />
        </div>
    )
}
