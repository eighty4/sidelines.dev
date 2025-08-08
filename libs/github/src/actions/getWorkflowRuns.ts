import { restGetJson } from '../request.ts'

export type WorkflowRun = {
    id: number
    path: string
    run_number: number
    run_attempt: number
    status:
        | 'queued'
        | 'in_progress'
        | 'completed'
        | 'requested'
        | 'waiting'
        | 'pending'
    conclusion:
        | null
        | 'success'
        | 'failure'
        | 'neutral'
        | 'cancelled'
        | 'skipped'
        | 'timed_out'
        | 'action_required'
}

export async function getWorkflowRuns(
    ghToken: string,
    owner: string,
    repo: string,
    workflow: string,
    opts?: {
        per_page?: number
        status?: WorkflowRun['status'] | WorkflowRun['conclusion']
    },
): Promise<Array<WorkflowRun>> {
    let url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/runs`
    if (opts) {
        url +=
            '?' +
            Object.entries(opts)
                .map(([k, v]) => `${k}=${v}`)
                .join('&')
    }
    const json = await restGetJson(ghToken, url)
    return json.workflow_runs.map((wr: any) => ({
        id: wr.id,
        path: wr.path,
        run_number: wr.run_number,
        run_attempt: wr.run_attempt,
        status: wr.status,
        conclusion: wr.conclusion,
    }))
}
