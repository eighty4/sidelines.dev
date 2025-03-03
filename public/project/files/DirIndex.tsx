import { useEffect, useState, type FC } from 'react'
import type {
    RepoDirListing,
    RepoFile,
    RepoSources,
} from '../workspace/RepoSources.ts'

interface DirIndexProps {
    dirpath: string
    repo: string
    sources: RepoSources
}

export const DirIndex: FC<DirIndexProps> = ({ dirpath, repo, sources }) => {
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
