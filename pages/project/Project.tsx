import { UnauthorizedError } from '@sidelines/github'
import type { RepositoryId, RepositoryPackage } from '@sidelines/model'
import { onDomInteractive } from '@sidelines/pageload/ready'
import { expectRepoFromLocation } from '@sidelines/pageload/urls'
import { ActivityHub } from '@sidelines/ui/activity/ActivityHub'
import { type FC, Suspense, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { UserDataClient } from '../../workers/userData/UserDataClient'
import { getUserDataClient } from '../expectUserData.ts'
import { loginRedirectUrl } from '../nav.ts'
import { ProjectNav } from './ProjectNav'
import { ProjectPackages } from './ProjectPackages.tsx'
import styles from './Project.module.css'

type ProjectPageProps = {
    repo: RepositoryId
    userData: UserDataClient
}

type PackagesState = 'loading' | Array<RepositoryPackage>

const ProjectWithUserData: FC<ProjectPageProps> = ({ repo, userData }) => {
    const loadingNav = useMemo(() => userData.navHistory(), [])
    const loadingPackages = useMemo(() => userData.repoPackages(repo), [])

    return (
        <div id={styles.page}>
            <div id={styles.dashboard}></div>
            <div id={styles.sidelines}>
                <div id={styles.packages}>
                    <Suspense fallback={<div>loading</div>}>
                        <ProjectPackages loadingPackages={loadingPackages} />
                    </Suspense>
                </div>
                <div id={styles.projects}>
                    <Suspense fallback={<div>loading</div>}>
                        <ProjectNav loadingProjects={loadingNav} />
                    </Suspense>
                </div>
            </div>
            <div id={styles.activity}>
                <ActivityHub />
            </div>
        </div>
    )
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

onDomInteractive(async () => {
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
