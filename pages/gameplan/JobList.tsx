import { useEffect, useState, type FC } from 'react'
import JobApiClient, {
    type JobMessaging,
    type JobSpec,
} from 'Sidelines.dev/workers/jobs/JobApiClient'
import type { JobExecUpdate } from 'Sidelines.dev/workers/jobs/jobMessaging'
import styles from './JobList.module.css'

console.log(styles)

export type JobListProps = {
    jobApiClient: JobApiClient
}

export const JobList: FC<JobListProps> = ({ jobApiClient }) => {
    // const [jobs, setJobs] = useState<'loading'>('loading')

    // useEffect(() => {
    //     const ls = jobApiClient.ls()
    //     ls.onUpdate = update => setRunningJobs(update.available)
    //     return () => ls.close()
    // }, [])

    return (
        <div className={styles.jobList}>
            {JobApiClient.availableJobs().map(job => (
                <JobListItem
                    key={job.jobId}
                    job={job}
                    jobApiClient={jobApiClient}
                />
            ))}
        </div>
    )
}

type JobListItemProps = {
    job: JobSpec
    jobApiClient: JobApiClient
}

const JobListItem: FC<JobListItemProps> = ({ job, jobApiClient }) => {
    const [messaging, setMessaging] = useState<JobMessaging<JobExecUpdate>>()

    useEffect(() => {
        if (messaging) messaging.onUpdate = onJobExecUpdate
    }, [messaging])

    function onJobExecUpdate(update: JobExecUpdate) {
        console.log('JobListItem.onJobExecUpdate', update)
    }

    return (
        <div className="job-list-item">
            {job.label}{' '}
            <button
                onClick={() => setMessaging(jobApiClient.exec(job.jobId))}
                disabled={!!messaging}
            >
                Exec
            </button>
        </div>
    )
}
