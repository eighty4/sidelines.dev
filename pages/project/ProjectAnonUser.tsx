import type { RepositoryId } from '@sidelines/model'
import { type FC } from 'react'
import { loginRedirectUrl } from '../nav.ts'

export type ProjectPageAnonUserProps = {
    repo: RepositoryId
}

export const ProjectPageAnonUser: FC<
    Omit<ProjectPageAnonUserProps, 'userData'>
> = ({ repo }) => {
    return (
        <>
            <h1>
                {repo.owner}/{repo.name}
            </h1>
            <p>not logged in</p>
            <p>
                <a href={loginRedirectUrl}>Login</a>
            </p>
        </>
    )
}
