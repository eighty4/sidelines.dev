import { type FC } from 'react'
import { RecentNav } from './RecentNav.tsx'
import { SearchInput } from './SearchInput.tsx'

interface ProjectNavbarProps {
  ghToken: string
  repo: string
}

export const ProjectNavbar: FC<ProjectNavbarProps> = ({ ghToken, repo }) => {
  return <div id="project-nav">
    <div id="project-nav-dashboard">{repo}</div>
    <RecentNav ghToken={ghToken} repo={repo} />
    <SearchInput ghToken={ghToken} repo={repo} />
  </div>
}
