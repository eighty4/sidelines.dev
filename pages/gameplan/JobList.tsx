import { useEffect, useState, type FC } from 'react'
import JobApiClient, {
    type JobMessaging,
} from 'Sidelines.dev/workers/jobs/JobApiClient'
import type {
    JobExecUpdate,
    JobSpec,
} from 'Sidelines.dev/workers/jobs/jobMessaging'

export type JobListProps = {
    jobApiClient: JobApiClient
}

export const JobList: FC<JobListProps> = ({ jobApiClient }) => {
    const [jobs, setJobs] = useState<Array<JobSpec> | 'loading'>('loading')

    useEffect(() => {
        const ls = jobApiClient.ls()
        ls.onUpdate = update => setJobs(update.available)
        return () => ls.close()
    }, [])

    if (jobs === 'loading') {
        return
    }

    return (
        <div className="job-list">
            {jobs.map(job => (
                <JobListItem
                    key={job.id}
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
                onClick={() => setMessaging(jobApiClient.exec(job))}
                disabled={!!messaging}
            >
                Exec
            </button>
        </div>
    )
}
