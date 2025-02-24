import { doesNotesRepoExist } from '@eighty4/sidelines-github'
import { useEffect, useState, type FC } from 'react'
import { MakeNotesRepo } from '../../../configure/MakeNotesRepo.tsx'
import { ghLoginCache } from '../../../storage.ts'
import type { RepoFile, RepoSources } from '../RepoSources.ts'

export interface WorkspaceEditorProps {
  ghToken: string
  repo: string
  sources: RepoSources
}

export const WorkspaceEditor: FC<WorkspaceEditorProps> = ({ ghToken, repo, sources }) => {
  const [openFile, setOpenFile] = useState<RepoFile | null>()
  const [notesRepoExists, setNotesRepoExists] = useState<Awaited<ReturnType<typeof doesNotesRepoExist>>>()

  useEffect(() => {
    doesNotesRepoExist(ghToken, repo).then(setNotesRepoExists)
  }, [])

  useEffect(() => {
    const subscription = sources.openFile.subscribe(setOpenFile)
    return () => subscription.unsubscribe()
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
    return <MakeNotesRepo ghToken={ghToken} repo={repo} onRepoMade={() => setNotesRepoExists(true)} />
  }

  if (openFile) {
    return <div>
      <code><pre>{openFile.type === 'file-cat' && openFile.content}</pre></code>
    </div>
  } else {
    if (notesRepoExists === 'project-readme-missing') {
      const owner = ghLoginCache.read()
      return <div>
        <p>Your .sidelines repository does not have a notes README.md for your {repo} project.</p>
        <p>The missing file is {repo}/README.md in {owner}/{repo}.</p>
        <p><button>Click here to create it</button></p>
      </div>
    } else {
      return
    }
  }
}
