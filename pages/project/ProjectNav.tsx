import type { RepositoryId } from '@sidelines/model'
import { use, type FC } from 'react'

export type ProjectNavProps = {
    loadingProjects: Promise<Array<RepositoryId>>
}

export const ProjectNav: FC<ProjectNavProps> = ({ loadingProjects }) => {
    const projects = use(loadingProjects)
    return projects.map((p, i) => {
        return (
            <div key={i}>
                {p.owner}/{p.name}
            </div>
        )
    })
}
