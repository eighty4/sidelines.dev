import {
    resolveRepoUserContext,
    type ViewerRepoUserContext,
} from '@sidelines/data/tx/repoContext'
import { UnauthorizedError } from '@sidelines/github'
import type { RepositoryId } from '@sidelines/model'
import { Unavailable } from '@sidelines/model/errors'
import { onDomInteractive } from '@sidelines/pageload/ready'
import { lookupGhToken } from '@sidelines/pageload/session'
import expectRepoFromLocation from '@sidelines/pageload/repoUrls/expectRepoLocation'
import { ActivityHub } from '@sidelines/ui/activity/ActivityHub'
import ErrorFallback from '@sidelines/ui/errors/ErrorFallback'
import { JobList } from '@sidelines/ui/jobs/JobList'
import { type FC, Suspense, use, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import JobApiClient from '../../workers/jobs/JobApiClient.ts'
import { UserDataClient } from '../../workers/userData/UserDataClient.ts'
import { logout } from '../nav.ts'
import { ProjectPageAnonUser } from './ProjectAnonUser.tsx'
import { ProjectNav } from './ProjectNav.tsx'
import { LoadingProjectPackages } from './ProjectPackages.tsx'
import { ProjectReadonly } from './ProjectReadonly.tsx'
import styles from './Project.module.css'

type LoadingProjectPageProps = {
    ghToken: string
    loadingUserContext: Promise<ViewerRepoUserContext | typeof Unavailable>
    repo: RepositoryId
}

const LoadingProjectPage: FC<LoadingProjectPageProps> = ({
    ghToken,
    loadingUserContext,
    repo,
}) => {
    const userContext = use(loadingUserContext)
    const jobApi = useMemo(() => new JobApiClient(ghToken), [userContext])
    const userData = useMemo(() => new UserDataClient(ghToken), [userContext])

    if (userContext === Unavailable) {
        return <div>you're offline</div>
    } else if (!userContext.repo) {
        return <div>no repo here</div>
    } else if (!userContext.repo.permissions.write) {
        return <ProjectReadonly repo={repo} />
    } else {
        return <ProjectPage jobApi={jobApi} repo={repo} userData={userData} />
    }
}

type ProjectPageProps = {
    repo: RepositoryId
    jobApi: JobApiClient
    userData: UserDataClient
}

const ProjectPage: FC<ProjectPageProps> = ({ repo, jobApi, userData }) => {
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
                    execJob={(jobId, cb) => jobApi.exec(jobId, cb, repo)}
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
    const repo = expectRepoFromLocation()
    const ghToken = lookupGhToken()
    const root = createRoot(document.getElementById('root')!)
    if (ghToken) {
        const loadingUserContext = resolveRepoUserContext(ghToken, repo)
        root.render(
            <ErrorFallback fallback={<div>error</div>} callback={onPageError}>
                <Suspense fallback={<div>loading</div>}>
                    <LoadingProjectPage
                        ghToken={ghToken}
                        repo={repo}
                        loadingUserContext={loadingUserContext}
                    />
                </Suspense>
            </ErrorFallback>,
        )
    } else {
        root.render(<ProjectPageAnonUser repo={repo} />)
    }
})

function onPageError(e: Error) {
    if (e instanceof UnauthorizedError) {
        logout()
    }
}
