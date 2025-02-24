import { getUserLogin } from '@eighty4/sidelines-github'
import type { FC } from 'react'
import { createRoot } from 'react-dom/client'
import { expectGhToken, ghLoginCache } from '../storage.ts'
import { ProjectNavbar } from './navbar/ProjectNavbar.tsx'
import { ProjectWorkspace } from './workspace/ProjectWorkspace.tsx'

function getProjectName(): string {
  const repo = new URL(location.href).searchParams.get('name')
  if (!repo) {
    location.assign('/')
  }
  return repo!
}

interface ProjectPageProps {
  ghToken: string
  repo: string
}

const ProjectPage: FC<ProjectPageProps> = ({ ghToken, repo }) => {
  return <div id="project">
    <ProjectNavbar ghToken={ghToken} repo={repo} />
    <ProjectWorkspace ghToken={ghToken} repo={repo} />
  </div>
}

document.addEventListener('DOMContentLoaded', async () => {
  const ghToken = expectGhToken()
  const preppingGhLoginCache = ghLoginCache.readThrough(() => getUserLogin(ghToken))
  const repo = getProjectName()
  await preppingGhLoginCache
  createRoot(document.getElementById('root')!).render(<ProjectPage ghToken={ghToken} repo={repo} />)
})
