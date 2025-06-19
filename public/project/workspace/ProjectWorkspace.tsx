import { useMemo, type FC } from 'react'
import { ProjectFiles } from '../files/ProjectFiles.tsx'
import { RepoSources } from './RepoSources.ts'
import { WorkspaceEditor } from './editor/WorkspaceEditor.tsx'

export interface ProjectWorkspaceProps {
    ghToken: string
    repo: string
}

export const ProjectWorkspace: FC<ProjectWorkspaceProps> = ({
    ghToken,
    repo,
}) => {
    const sources = useMemo(() => new RepoSources(ghToken, repo), [])

    return (
        <div id="project-workspace">
            <div id="file-ls">
                <ProjectFiles repo={repo} sources={sources} />
            </div>
            <WorkspaceEditor ghToken={ghToken} repo={repo} sources={sources} />
        </div>
    )
}
