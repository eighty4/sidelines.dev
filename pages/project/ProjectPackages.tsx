import type {
    Package,
    PackageWorkspace,
    RepositoryPackage,
} from '@sidelines/model'
import { RefNotFound, RepoNotFound } from '@sidelines/model/errors'
import { use, type FC } from 'react'
import type { RepoPackagesResponse } from '../../workers/userData/UserDataWorker.ts'

const packageKey = (p: RepositoryPackage) => `${p.language}-${p.path}`

export type LoadingProjectPackagesProps = {
    loadingPackages: Promise<RepoPackagesResponse['result']>
}

export const LoadingProjectPackages: FC<LoadingProjectPackagesProps> = ({
    loadingPackages,
}) => {
    const packages = use(loadingPackages)

    if (packages === RefNotFound) {
        return <div>Unable to fetch packages.</div>
    } else if (packages === RepoNotFound) {
        return <div>Repo does not exist.</div>
    } else {
        return <ProjectPackages packages={packages} />
    }
}

export type ProjectPackagesProps = {
    packages: Array<RepositoryPackage>
}

export const ProjectPackages: FC<ProjectPackagesProps> = ({ packages }) => {
    return packages.map(p => {
        if ('packages' in p) {
            return <WorkspacePackages key={packageKey(p)} workspace={p} />
        } else {
            return <PackageListItem key={packageKey(p)} package={p} />
        }
    })
}

type WorkspacePackagesProps = {
    workspace: PackageWorkspace<any>
}

const WorkspacePackages: FC<WorkspacePackagesProps> = ({ workspace }) => {
    return (
        <div>
            {workspace.root ? (
                <PackageListItem package={workspace.root} />
            ) : (
                <div>{workspace.language}</div>
            )}
            {workspace.packages.map(p => (
                <PackageListItem key={p.path} package={p} />
            ))}
        </div>
    )
}

type PackageProps = {
    package: Package<any>
}

const PackageListItem: FC<PackageProps> = ({ package: p }) => {
    return (
        <div>
            <div>{p.name}</div>
            {/* <div>
                {p.version}
            </div>
            <div>
                {p.language}
            </div>
            <div>
                 {p.path}
            </div> */}
            {/* <div>{p.configFile}</div> */}
            {/* {p.produces && <div>{p.produces.join(' ')}</div>} */}
            {/* {p.private && <div>private</div>} */}
        </div>
    )
}
