import type { FC } from 'react'

export type WatchToggleProps = {
    hasWatch: boolean
    onToggle: () => void
}

export const WatchToggle: FC<WatchToggleProps> = ({ hasWatch, onToggle }) => {
    return (
        <div id="watch-toggle">
            <input
                type="checkbox"
                checked={hasWatch}
                onChange={() => onToggle()}
            />
        </div>
    )
}
