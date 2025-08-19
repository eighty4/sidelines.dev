import { checkSidelinesRepo } from '@sidelines/github'
import type { RepositoryId } from '@sidelines/model'
import { type FC, useEffect, useState } from 'react'
import { EditorPane } from './EditorPane.tsx'
import type { RepoFile, RepoSources } from '../RepoSources.ts'
import { MakeSidelinesRepo } from '../../../configure/MakeSidelinesRepo.tsx'

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
    const [sidelinesRepo, setSidelinesRepo] =
        useState<Awaited<ReturnType<typeof checkSidelinesRepo>>>()

    useEffect(() => {
        checkSidelinesRepo(ghToken).then(setSidelinesRepo)
    }, [])

    useEffect(() => {
        const subscription = sources.openFile.subscribe(setOpenFile)
        return () => subscription.unsubscribe()
    }, [])

    if (typeof sidelinesRepo === 'undefined') {
        return
    }

    if (sidelinesRepo === false) {
        return (
            <MakeSidelinesRepo
                ghToken={ghToken}
                ghLogin={ghLogin}
                repo={repo}
                onRepoMade={() => setSidelinesRepo(true)}
            />
        )
    }

    if (sidelinesRepo !== true) {
        return (
            <div>
                <p>
                    Your .sidelines repository might not be correctly configured
                    for Sidelines.dev.
                </p>
                <p>
                    Head to the <a href="/configure">configure page</a>
                    for more details!
                </p>
            </div>
        )
    }

    if (openFile) {
        return <EditorPane openFile={openFile} />
    }
}
