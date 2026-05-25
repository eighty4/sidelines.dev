import { UnauthorizedError } from '@sidelines/github'
import type { RepositoryId } from '@sidelines/model'
import { onDomInteractive } from '@sidelines/pageload/ready'
import { expectRepoFromLocation } from '@sidelines/pageload/urls'
import { ActivityHub } from '@sidelines/ui/activity/ActivityHub'
import { JobList } from '@sidelines/ui/jobs/JobList'
import { type FC, Suspense, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import JobApiClient from '../../workers/jobs/JobApiClient.ts'
import { UserDataClient } from '../../workers/userData/UserDataClient.ts'
import { getUserDataClient } from '../expectUserData.ts'
import { ProjectPageAnonUser } from './ProjectAnonUser.tsx'
import { ProjectNav } from './ProjectNav.tsx'
import { LoadingProjectPackages } from './ProjectPackages.tsx'
import styles from './Project.module.css'

type ProjectPageProps = {
    jobApiClient: JobApiClient
    repo: RepositoryId
    userData: UserDataClient
}

// todo load AnonUserProjectPage as separate async module
// todo add ErrorBoundary around packages and nav Suspense
// todo root.render(<ProjectPage/>) with a graphql promise that fetches repo ownership/visibility

const ProjectPage: FC<ProjectPageProps> = ({
    jobApiClient,
    repo,
    userData,
}) => {
    const loadingNav = useMemo(() => userData.navHistory(), [])
    const loadingPackages = useMemo(() => userData.repoPackages(repo), [])

    useEffect(() => {
        loadingPackages
            .then(() => userData.navVisit(repo))
            .catch(e =>
                console.error('error awaiting userData.repoPackages', e),
            )
    }, [])

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
                        <LoadingProjectPackages
                            loadingPackages={loadingPackages}
                        />
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
    const root = createRoot(document.getElementById('root')!)
    if (userData) {
        const jobApiClient = new JobApiClient(userData.ghToken)
        userData.navVisit(repo)
        root.render(
            <ProjectPage
                jobApiClient={jobApiClient}
                repo={repo}
                userData={userData}
            />,
        )
    } else {
        root.render(<ProjectPageAnonUser repo={repo} />)
    }
})
