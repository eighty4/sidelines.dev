import { useEffect, useState, type FC } from 'react'
import type { RepoFile, RepoSources } from '../RepoSources.ts'
import { ghLoginCache } from '../../../storage.ts'

export interface WorkspaceEditorProps {
  missingNotesReadme: boolean
  repo: string
  sources: RepoSources
}

export const WorkspaceEditor: FC<WorkspaceEditorProps> = ({ missingNotesReadme, repo, sources }) => {
  const [openFile, setOpenFile] = useState<RepoFile | null>()

  useEffect(() => {
    const subscription = sources.openFile.subscribe(setOpenFile)
    return () => subscription.unsubscribe()
  }, [])

  if (!openFile) {
    if (missingNotesReadme) {
      const owner = ghLoginCache.read()
      return <div>
        <p>Your .sidelines repository does not have a README.md for its {repo} notes.</p>
        <p>The missing file is {repo}/README.md in {owner}/{repo}.</p>
        <p><button>Click here to create it</button></p>
      </div>
    } else {
      return
    }
  }

  return <div>
    <code><pre>{openFile.type === 'file-cat' && openFile.content}</pre></code>
  </div>
}
