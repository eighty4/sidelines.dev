import type { TreeEntryInfo } from '@sidelines/github/repository/objects/types'
import { type FC, type MouseEvent } from 'react'

export type FileBrowserProps = {
    objects: Array<TreeEntryInfo>
    onFileSelection: (filename: string) => void
}

export const FileBrowser: FC<FileBrowserProps> = ({
    objects,
    onFileSelection,
}) => {
    function onClick(e: MouseEvent<HTMLElement>) {
        console.log((e.target as HTMLElement).dataset.name)
        onFileSelection((e.target as HTMLElement).dataset.name!)
    }

    return (
        <div>
            <div>File browser</div>
            {objects.map(object => {
                return (
                    <div
                        key={object.name}
                        data-name={object.name}
                        onClick={onClick}
                    >
                        {object.kind === 'blob' ? 'F' : 'D'} {object.name}
                    </div>
                )
            })}
        </div>
    )
}
