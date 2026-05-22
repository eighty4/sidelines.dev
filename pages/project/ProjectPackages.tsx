import type {
    Package,
    PackageWorkspace,
    RepositoryPackage,
} from '@sidelines/model'
import { use, type FC } from 'react'

export type ProjectPackagesProps = {
    loadingPackages: Promise<Array<RepositoryPackage>>
}

const packageKey = (p: RepositoryPackage) => `${p.language}-${p.path}`

export const ProjectPackages: FC<ProjectPackagesProps> = ({
    loadingPackages,
}) => {
    const packages = use(loadingPackages)
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
