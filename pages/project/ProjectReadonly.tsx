import type { RepositoryId } from '@sidelines/model'
import type { FC } from 'react'

type ProjectReadonlyProps = {
    repo: RepositoryId
}

export const ProjectReadonly: FC<ProjectReadonlyProps> = ({ repo }) => {
    return (
        <div>
            <h1>
                {repo.owner}/{repo.name}
            </h1>
        </div>
    )
}
