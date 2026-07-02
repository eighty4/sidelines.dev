import type { ChannelDataSubscription, DataCallback } from '@sidelines/model'
import type { RepoJobId } from '@sidelines/model/jobs/id'
import type { RepoJobSpec } from '@sidelines/model/jobs/spec'
import type { RepoJobExecUpdate } from '@sidelines/model/jobs/updates'
import { useEffect, useState, type FC } from 'react'
import styles from './JobList.module.css'

// todo availableJobs will be async when jobs are resolved dynamically
export type JobListProps = {
    availableJobs: Array<RepoJobSpec>
    execJob(
        jobId: RepoJobId,
        cb: DataCallback<RepoJobExecUpdate>,
    ): ChannelDataSubscription<RepoJobExecUpdate>
}

export const JobList: FC<JobListProps> = ({ availableJobs, execJob }) => {
    // const [jobs, setJobs] = useState<'loading'>('loading')

    // useEffect(() => {
    //     const ls = jobApiClient.ls()
    //     ls.onUpdate = update => setRunningJobs(update.available)
    //     return () => ls.close()
    // }, [])

    return (
        <div className={styles.jobList}>
            {availableJobs.map(job => (
                <JobListItem key={job.jobId} job={job} execJob={execJob} />
            ))}
        </div>
    )
}

type JobListItemProps = {
    job: RepoJobSpec
    execJob(
        jobId: RepoJobId,
        cb: (update: RepoJobExecUpdate) => void,
    ): ChannelDataSubscription<RepoJobExecUpdate>
}

const JobListItem: FC<JobListItemProps> = ({ job, execJob }) => {
    const [executing, setExecuting] =
        useState<ChannelDataSubscription<RepoJobExecUpdate> | null>(null)
    const [status, setStatus] = useState<RepoJobExecUpdate | null>(null)

    useEffect(() => {
        return () => {
            if (executing) {
                executing.unsubscribe()
            }
        }
    }, [])

    function onExecUpdate(update: RepoJobExecUpdate) {
        console.log('update', update)
        setStatus(update)
    }

    return (
        <div className="job-list-item">
            <div>
                {job.label}{' '}
                <button
                    onClick={() =>
                        setExecuting(execJob(job.jobId, onExecUpdate))
                    }
                    disabled={executing !== null}
                >
                    Exec
                </button>
            </div>
            {!!status && <div>Finished with {status.status.state}</div>}
        </div>
    )
}
