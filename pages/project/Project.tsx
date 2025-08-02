import { UserDataClient } from '@sidelines/data/web'
import { UnauthorizedError } from '@sidelines/github'
import type { RepositoryId } from '@sidelines/model'
import { type FC } from 'react'
import { createRoot } from 'react-dom/client'
import { getUserDataClient } from '../init.ts'
import { expectRepoFromLocation } from '../nav.ts'

type ProjectPageProps = {
    repo: RepositoryId
    userData: UserDataClient | null
}

const Project: FC<ProjectPageProps> = ({ repo, userData }) => {
    return (
        <>
            <h1>
                {repo.owner}/{repo.name}
            </h1>
            <p>{userData === null ? 'not logged in' : 'logged in'}</p>
        </>
    )
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
    }
    createRoot(document.getElementById('root')!).render(
        <Project repo={repo} userData={userData} />,
    )
})
