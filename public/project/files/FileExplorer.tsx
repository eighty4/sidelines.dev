import type { FC } from 'react'
import type { RepoSources } from '../workspace/RepoSources.ts'
import { DirIndex } from './DirIndex.tsx'

interface FileExplorerProps {
    repo: '.sidelines' | string
    rootDirpath: string
    sources: RepoSources
    title: 'Notes' | 'Workflows'
}

export const FileExplorer: FC<FileExplorerProps> = ({
    repo,
    rootDirpath,
    sources,
    title,
}) => {
    return (
        <div>
            <div className="file-explorer-header">{title}</div>
            <DirIndex dirpath={rootDirpath} repo={repo} sources={sources} />
        </div>
    )
}
