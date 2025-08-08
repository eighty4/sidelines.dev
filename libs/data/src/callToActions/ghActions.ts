import {
    readWorkflowModel,
    type GHWorkflow,
    type GHWorkflowSchemaError,
} from '@eighty4/model-t'
import { getRepoDirContent, isWorkflowPassing } from '@sidelines/github'
import type { RepositoryObject } from '@sidelines/model'

export type CicdCallToAction = {
    // no CICD checks on push or pull_request
    type: 'cicd-missing'
    event: 'push' | 'pull_request'
}

export type WorkflowCallToAction =
    | {
          // workflow failing validation
          type: 'cicd-error'
          errors: Array<GHWorkflowSchemaError>
      }
    | {
          // workflow failed last run
          type: 'cicd-failing'
      }

export type ActionsCallToActionsRequest = {
    ghToken: string
    ghLogin: string
    repo: string
}

export type ActionsCallToActionsUpdate =
    | {
          kind: 'done'
          repo: string
      }
    | {
          kind: 'pending'
          repo: string
          workflows: Array<string>
      }
    | {
          kind: 'cicd'
          repo: string
          callToActions: Array<CicdCallToAction>
      }
    | {
          kind: 'workflow'
          repo: string
          workflow: string
          state: 'good' | WorkflowCallToAction
      }
    | {
          kind: 'error'
          message: string
      }

const sendUpdate = (update: ActionsCallToActionsUpdate) => postMessage(update)

function isValidMessage(msg: unknown): msg is ActionsCallToActionsRequest {
    return (
        msg !== null &&
        typeof msg === 'object' &&
        'ghToken' in msg &&
        typeof msg.ghToken === 'string' &&
        msg.ghToken.length > 0 &&
        'ghLogin' in msg &&
        typeof msg.ghLogin === 'string' &&
        msg.ghLogin.length > 0 &&
        'repo' in msg &&
        typeof msg.repo === 'string'
    )
}

onmessage = async e => {
    if (!isValidMessage(e.data)) {
        console.error(
            'ghActions.ts web worker message payload must be a valid ActionsCallToActionsRequest',
        )
    } else {
        const { ghToken, ghLogin, repo } = e.data
        await checkRepoWorkflows(ghToken, ghLogin, repo)
    }
}

async function checkRepoWorkflows(
    ghToken: string,
    ghLogin: string,
    repo: string,
) {
    const workflowDirFiles = await getRepoDirContent(
        ghToken,
        repo,
        '.github/workflows',
    )
    if (workflowDirFiles === 'repo-does-not-exist') {
        sendUpdate({
            kind: 'error',
            message: 'repo does not exist',
        })
    } else {
        const workflowFiles: Array<{ name: string; content: string }> =
            workflowDirFiles.filter(
                (workflow: RepositoryObject) =>
                    workflow.type === 'file-cat' &&
                    /.*\.ya?ml$/.test(workflow.name),
            ) as Array<{ name: string; content: string }>
        if (!workflowFiles.length) {
            sendUpdate({
                kind: 'cicd',
                repo,
                callToActions: [
                    { type: 'cicd-missing', event: 'pull_request' },
                    { type: 'cicd-missing', event: 'push' },
                ],
            })
        } else {
            sendUpdate({
                kind: 'pending',
                repo,
                workflows: workflowFiles.map(workflow => workflow.name),
            })
            const workflows = await Promise.all(
                workflowFiles.map(file =>
                    checkWorkflow(
                        ghToken,
                        ghLogin,
                        repo,
                        file.name,
                        file.content,
                    ),
                ),
            )
            const cicd: Array<CicdCallToAction> = (
                ['pull_request', 'push'] as Array<CicdCallToAction['event']>
            )
                .filter(
                    event => !workflows.some(workflow => workflow.on[event]),
                )
                .map(event => ({ type: 'cicd-missing', event }))
            if (cicd.length) {
                sendUpdate({
                    kind: 'cicd',
                    repo,
                    callToActions: cicd,
                })
            }
        }
        sendUpdate({ kind: 'done', repo })
    }
}

async function checkWorkflow(
    ghToken: string,
    ghLogin: string,
    repo: string,
    workflow: string,
    content: string,
): Promise<GHWorkflow> {
    const { workflow: workflowModel, schemaErrors } = readWorkflowModel(content)
    if (schemaErrors.length) {
        sendUpdate({
            kind: 'workflow',
            repo,
            workflow,
            state: {
                type: 'cicd-error',
                errors: schemaErrors,
            },
        })
    } else {
        const passing = await isWorkflowPassing(
            ghToken,
            ghLogin,
            repo,
            workflow,
        )
        if (passing) {
            sendUpdate({
                kind: 'workflow',
                repo,
                workflow,
                state: 'good',
            })
        } else {
            sendUpdate({
                kind: 'workflow',
                repo,
                workflow,
                state: {
                    type: 'cicd-failing',
                },
            })
        }
    }
    return workflowModel
}
