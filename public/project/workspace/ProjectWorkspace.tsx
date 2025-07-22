import type { RepositoryId } from '@sidelines/data/web'
import { useMemo, type FC } from 'react'
import { RepoSources } from './RepoSources.ts'
import { WorkspaceEditor } from './editor/WorkspaceEditor.tsx'
import { ProjectFiles } from '../files/ProjectFiles.tsx'

export interface ProjectWorkspaceProps {
    ghToken: string
    ghLogin: string
    repo: RepositoryId
}

export const ProjectWorkspace: FC<ProjectWorkspaceProps> = ({
    ghToken,
    ghLogin,
    repo,
}) => {
    const sources = useMemo(() => new RepoSources(ghToken, repo), [])

    return (
        <div id="project-workspace">
            <div id="file-ls">
                <ProjectFiles repo={repo} sources={sources} />
            </div>
            <WorkspaceEditor
                ghToken={ghToken}
                ghLogin={ghLogin}
                repo={repo}
                sources={sources}
            />
        </div>
    )
}
