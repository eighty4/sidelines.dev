import { UnauthorizedError } from '@sidelines/github'
import type { RepositoryId } from '@sidelines/model'
import { onDomInteractive } from '@sidelines/pageload/ready'
import { expectRepoFromLocation } from '@sidelines/pageload/urls'
import { ActivityHub } from '@sidelines/ui/activity/ActivityHub'
import { JobList } from '@sidelines/ui/jobs/JobList'
import { type FC, Suspense, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import JobApiClient from '../../workers/jobs/JobApiClient.ts'
import { UserDataClient } from '../../workers/userData/UserDataClient'
import { getUserDataClient } from '../expectUserData.ts'
import { loginRedirectUrl } from '../nav.ts'
import { ProjectNav } from './ProjectNav'
import { ProjectPackages } from './ProjectPackages.tsx'
import styles from './Project.module.css'

type ProjectPageProps = {
    jobApiClient: JobApiClient
    repo: RepositoryId
    userData: UserDataClient
}

const ProjectWithUserData: FC<ProjectPageProps> = ({
    jobApiClient,
    repo,
    userData,
}) => {
    const loadingNav = useMemo(() => userData.navHistory(), [])
    const loadingPackages = useMemo(() => userData.repoPackages(repo), [])

    return (
        <div id={styles.page}>
            <div id={styles.dashboard}>
                <h1>
                    {repo.owner}/{repo.name}
                </h1>
                <h2>Run a job:</h2>
                <JobList
                    availableJobs={JobApiClient.availableJobs()}
                    execJob={(jobId, cb) => jobApiClient.exec(jobId, cb)}
                />
            </div>
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

const Project: FC<Pick<ProjectPageProps, 'repo'>> = ({ repo }) => {
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
        const jobApiClient = new JobApiClient(userData.ghToken)
        userData.navVisit(repo)
        createRoot(document.getElementById('root')!).render(
            <ProjectWithUserData
                jobApiClient={jobApiClient}
                repo={repo}
                userData={userData}
            />,
        )
    } else {
        createRoot(document.getElementById('root')!).render(
            <Project repo={repo} />,
        )
    }
})
