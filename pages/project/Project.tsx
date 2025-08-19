import { UnauthorizedError } from '@sidelines/github'
import type { RepositoryId, RepositoryPackage } from '@sidelines/model'
import { type FC, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getUserDataClient } from '../init.ts'
import { loginRedirectUrl } from '../nav.ts'
import { expectRepoFromLocation } from '../repoFromLocation.ts'
import { UserDataClient } from '../../workers/UserDataClient.ts'

type ProjectPageProps = {
    repo: RepositoryId
    userData: UserDataClient
}

const Project: FC<Omit<ProjectPageProps, 'userData'>> = ({ repo }) => {
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

type PackagesState = 'loading' | Array<RepositoryPackage> | 'repo-not-found'

const ProjectWithUserData: FC<ProjectPageProps> = ({ repo, userData }) => {
    const [packages, setPackages] = useState<PackagesState>('loading')

    useEffect(() => {
        if (packages !== 'loading') setPackages('loading')
        userData.repoPackages(repo).then(setPackages).catch(console.error)
    }, [repo])

    return <pre>{JSON.stringify(packages, null, 4)}</pre>
}

document.addEventListener('DOMContentLoaded', async () => {
    let userData: UserDataClient | null = null
    try {
        userData = await getUserDataClient()
    } catch (e) {
        if (e instanceof UnauthorizedError) {
            console.log(e)
        } else {
            throw e
        }
    }
    const repo = expectRepoFromLocation()
    if (userData) {
        userData.navVisit(repo)
        createRoot(document.getElementById('root')!).render(
            <ProjectWithUserData repo={repo} userData={userData} />,
        )
    } else {
        createRoot(document.getElementById('root')!).render(
            <Project repo={repo} />,
        )
    }
})
