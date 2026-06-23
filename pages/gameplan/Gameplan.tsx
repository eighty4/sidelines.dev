import { UnauthorizedError } from '@sidelines/github'
import { onDomInteractive } from '@sidelines/pageload/ready'
import { expectGhLogin, expectGhToken } from '@sidelines/pageload/session'
import { JobList } from '@sidelines/ui/jobs/JobList'
import { type FC } from 'react'
import { createRoot } from 'react-dom/client'
import JobApiClient from '../../workers/jobs/JobApiClient.ts'
import { createLogoutButton, logout } from '../nav.ts'

interface GameplanPageProps {
    ghToken: string
    ghLogin: string
    jobApiClient: JobApiClient
}

const Gameplan: FC<GameplanPageProps> = ({ jobApiClient }) => {
    return (
        <div id="view">
            <JobList
                availableJobs={JobApiClient.availableJobs()}
                execJob={(jobId, cb) => jobApiClient.exec(jobId, cb)}
            />
            <div id="reading-cta" onClick={() => location.assign('/watches')}>
                Go to Watches
            </div>
        </div>
    )
}

onDomInteractive(async () => {
    let ghToken: string
    let ghLogin: string
    try {
        ghToken = expectGhToken()
        ghLogin = await expectGhLogin(ghToken)
        console.log('authed', ghLogin, 'for page')
    } catch (e) {
        if (e instanceof UnauthorizedError) {
            console.log('unauthorized for page, redirecting to logout')
            logout()
            return
        } else {
            throw e
        }
    }
    const jobApiClient = new JobApiClient(ghToken)
    createRoot(document.getElementById('root')!).render(
        <Gameplan
            ghToken={ghToken}
            ghLogin={ghLogin}
            jobApiClient={jobApiClient}
        />,
    )
    document.body.appendChild(createLogoutButton())
})
