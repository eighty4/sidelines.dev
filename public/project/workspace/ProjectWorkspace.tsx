import { doesNotesRepoExist } from '@eighty4/sidelines-github'
import { useEffect, useMemo, useState, type FC } from 'react'
import { ProjectFiles } from '../files/ProjectFiles.tsx'
import { RepoSources } from './RepoSources.ts'
import { WorkspaceEditor } from './editor/WorkspaceEditor.tsx'
import { ghLoginCache, ghLoginCacheRead } from '../../storage.ts'

export interface ProjectWorkspaceProps {
  ghToken: string
  repo: string
}

export const ProjectWorkspace: FC<ProjectWorkspaceProps> = ({ ghToken, repo }) => {
  const sources = useMemo(() => new RepoSources(ghToken, repo), [])
  const [notesRepoExists, setNotesRepoExists] = useState<Awaited<ReturnType<typeof doesNotesRepoExist>>>()

  useEffect(() => {
    doesNotesRepoExist(ghToken, repo).then(setNotesRepoExists)
  }, [])

  if (typeof notesRepoExists === 'undefined') {
    return
  }

  if (notesRepoExists === 'misconfigured') {
    const owner = ghLoginCache.read()
    return <div>
      <p>Your <a href={`https://github.com/${owner}/.sidelines`}>{owner}/.sidelines</a> repository might not be correct for management by Sidelines.dev. Set the repository's homepage URL to https://sidelines.dev if the repository can be managed by this app.</p>
    </div>
  }

  if (notesRepoExists === false) {
    return <div>
      <p>Your GitHub account does not have a .sidelines repository.</p>
      <p><a href="/configure">Click here</a> to configure a repository for Sidelines.dev data.</p>
    </div>
  }

  return <div id="project-workspace">
    <div id="file-ls">
      <ProjectFiles repo={repo} sources={sources} />
    </div>
    <div id="editor-pane">
      <WorkspaceEditor
        missingNotesReadme={notesRepoExists === 'project-readme-missing'}
        repo={repo}
        sources={sources} />
    </div>
  </div>
}
