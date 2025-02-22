import { getUserLogin } from '@eighty4/sidelines-github'
import type { FC } from 'react'
import { createRoot } from 'react-dom/client'
import { ghLoginCache, readGhTokenCookie } from '../storage.ts'
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
    <ProjectWorkspace ghToken={ghToken} repo={repo} />
  </div>
}

document.addEventListener('DOMContentLoaded', async () => {
  const ghToken = readGhTokenCookie()
  const repo = getProjectName()
  try {
    await ghLoginCache.readThrough(() => getUserLogin(ghToken))
  } catch (e) {
    // todo redirect 401 to /login
    console.error(e)
  }
  createRoot(document.getElementById('root')!).render(<ProjectPage ghToken={ghToken} repo={repo} />)
})
