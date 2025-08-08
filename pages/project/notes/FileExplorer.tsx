import type { RepositoryId } from '@sidelines/model'
import { type FC, useEffect, useState } from 'react'
import type { RepoDirListing, RepoFile, RepoSources } from './RepoSources.ts'

export type FileExplorerProps = {
    ghLogin: string
    repo: RepositoryId
    sources: RepoSources
}

export const FileExplorer: FC<FileExplorerProps> = ({
    ghLogin,
    repo,
    sources,
}) => {
    return (
        <div id="project-files">
            <FileExplorerSection
                sources={sources}
                repo={{ owner: ghLogin, name: '.sidelines' }}
                rootDirpath={repo.name}
                title="Notes"
            />
            <FileExplorerSection
                sources={sources}
                repo={repo}
                rootDirpath=".github/workflows"
                title="Workflows"
            />
        </div>
    )
}

type FileExplorerSectionProps = {
    repo: RepositoryId
    rootDirpath: string
    sources: RepoSources
    title: 'Notes' | 'Workflows'
}

const FileExplorerSection: FC<FileExplorerSectionProps> = ({
    repo,
    rootDirpath,
    sources,
    title,
}) => {
    return (
        <div>
            <div className="file-explorer-header">{title}</div>
            <FileExplorerDirIndex
                dirpath={rootDirpath}
                repo={repo}
                sources={sources}
            />
        </div>
    )
}

type FileExplorerDirIndexProps = {
    dirpath: string
    repo: RepositoryId
    sources: RepoSources
}

const FileExplorerDirIndex: FC<FileExplorerDirIndexProps> = ({
    dirpath,
    repo,
    sources,
}) => {
    const [listing, setListing] = useState<RepoDirListing>()
    const [openFile, setOpenFile] = useState<RepoFile | null>()

    useEffect(() => {
        const subscription = sources.ls(repo, dirpath).subscribe(setListing)
        return () => subscription.unsubscribe()
    }, [])

    useEffect(() => {
        const subscription = sources.openFile.subscribe(setOpenFile)
        return () => subscription.unsubscribe()
    }, [])

    if (!listing) {
        return
    }

    if (listing.status === 'loading' && listing.cached?.length) {
        // todo loading indicator for display of cached ls before graphql response
        return (
            <div>
                {listing.cached.map(name => (
                    <div key={name} className="file">
                        {name}
                    </div>
                ))}
            </div>
        )
    }

    if (listing.status === 'listed') {
        return (
            <div>
                {listing.files.map(source => {
                    switch (source.type) {
                        case 'dir':
                            return <div key={source.name}>{source.name}</div>
                        case 'file-ls':
                        case 'file-cat':
                            const isOpen = openFile?.name === source.name
                            const className = isOpen ? 'file open' : 'file'
                            const onClick = isOpen
                                ? undefined
                                : () => (sources.openFile = source)
                            return (
                                <div
                                    key={source.name}
                                    className={className}
                                    onClick={onClick}
                                >
                                    {source.name}
                                </div>
                            )
                    }
                })}
            </div>
        )
    }
}
