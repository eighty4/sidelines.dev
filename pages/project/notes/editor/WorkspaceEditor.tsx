import { doesSidelinesRepoExist } from '@sidelines/github'
import type { RepositoryId } from '@sidelines/model'
import { type FC, useEffect, useState } from 'react'
import { EditorPane } from './EditorPane.tsx'
import type { RepoFile, RepoSources } from '../RepoSources.ts'
import { MakeNotesRepo } from '../../../configure/MakeNotesRepo.tsx'

export interface WorkspaceEditorProps {
    ghToken: string
    ghLogin: string
    repo: RepositoryId
    sources: RepoSources
}

export const WorkspaceEditor: FC<WorkspaceEditorProps> = ({
    ghToken,
    ghLogin,
    repo,
    sources,
}) => {
    const [openFile, setOpenFile] = useState<RepoFile | null>()
    const [notesRepoExists, setNotesRepoExists] =
        useState<Awaited<ReturnType<typeof doesSidelinesRepoExist>>>()

    useEffect(() => {
        doesSidelinesRepoExist(ghToken, repo.name).then(setNotesRepoExists)
    }, [])

    useEffect(() => {
        const subscription = sources.openFile.subscribe(setOpenFile)
        return () => subscription.unsubscribe()
    }, [])

    if (typeof notesRepoExists === 'undefined') {
        return
    }

    if (notesRepoExists === 'misconfigured') {
        return (
            <div>
                <p>
                    Your{' '}
                    <a href={`https://github.com/${ghLogin}/.sidelines`}>
                        {ghLogin}/.sidelines
                    </a>{' '}
                    repository might not be correct for management by
                    Sidelines.dev. Set the repository's homepage URL to
                    https://sidelines.dev if the repository can be managed by
                    this app.
                </p>
            </div>
        )
    }

    if (notesRepoExists === false) {
        return (
            <MakeNotesRepo
                ghToken={ghToken}
                ghLogin={ghLogin}
                repo={repo}
                onRepoMade={() => setNotesRepoExists(true)}
            />
        )
    }

    if (openFile) {
        return <EditorPane openFile={openFile} />
    } else {
        if (notesRepoExists === 'project-readme-missing') {
            return (
                <div>
                    <p>
                        Your .sidelines repository does not have a notes
                        README.md for your {repo.name} project.
                    </p>
                    <p>
                        The missing file is {repo.name}/README.md in{' '}
                        {repo.owner}/{repo.name}.
                    </p>
                    <p>
                        <button>Click here to create it</button>
                    </p>
                </div>
            )
        } else {
            return
        }
    }
}
