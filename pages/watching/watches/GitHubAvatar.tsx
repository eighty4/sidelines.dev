import type { FC } from 'react'

function url(login: string, size: number): string {
    return `https://github.com/${login}.png?size=${size}`
}

export type GitHubAvatarProps = {
    login: string
    size: number
}

export const GitHubAvatar: FC<GitHubAvatarProps> = ({ login, size }) => {
    return (
        <img
            src={url(login, size)}
            height={size}
            width={size}
            alt={`${login}'s avatar picture`}
        />
    )
}
