import { getWorkflowRuns } from './getWorkflowRuns.ts'

export async function isWorkflowPassing(
    ghToken: string,
    owner: string,
    repo: string,
    workflow: string,
) {
    const workflowRuns = await getWorkflowRuns(ghToken, owner, repo, workflow, {
        per_page: 1,
        status: 'completed',
    })
    return !workflowRuns.length || workflowRuns[0].conclusion === 'success'
}
