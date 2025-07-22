import type { RepositoryId } from '@sidelines/data/web'
import { type FC } from 'react'
import { RepoSources } from '../workspace/RepoSources.ts'
import { FileExplorer } from './FileExplorer.tsx'

export interface ProjectFilesProps {
    repo: RepositoryId
    sources: RepoSources
}

export const ProjectFiles: FC<ProjectFilesProps> = ({ repo, sources }) => {
    return (
        <div id="project-files">
            <FileExplorer
                sources={sources}
                repo=".sidelines"
                rootDirpath={repo.name}
                title="Notes"
            />
            <FileExplorer
                sources={sources}
                repo={repo.name}
                rootDirpath=".github/workflows"
                title="Workflows"
            />
        </div>
    )
}
