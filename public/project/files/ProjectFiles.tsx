import { type FC } from 'react'
import { RepoSources } from '../workspace/RepoSources.ts'
import { FileExplorer } from './FileExplorer.tsx'

export interface ProjectFilesProps {
    repo: string
    sources: RepoSources
}

export const ProjectFiles: FC<ProjectFilesProps> = ({ repo, sources }) => {
    return (
        <div id="project-files">
            <FileExplorer
                sources={sources}
                repo=".sidelines"
                rootDirpath={repo}
                title="Notes"
            />
            <FileExplorer
                sources={sources}
                repo={repo}
                rootDirpath=".github/workflows"
                title="Workflows"
            />
        </div>
    )
}
