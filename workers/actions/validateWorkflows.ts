import {
    readWorkflowModel,
    type GHWorkflow,
    type GHWorkflowSchemaError,
} from '@eighty4/model-t'
import { isWorkflowPassing } from '@sidelines/github/actions/isWorkflowPassing'
import { queryViewerRepoWorkflowContents } from '@sidelines/github/actions/queryViewerRepoWorkflowContents'
import { RepoNotFound, TreeObjectNotFound } from '@sidelines/model/errors'

declare const self: DedicatedWorkerGlobalScope

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

const sendUpdate = (update: ActionsCallToActionsUpdate) =>
    self.postMessage(update)

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

self.onmessage = async e => {
    if (!isValidMessage(e.data)) {
        console.error(
            'ghActions.ts web worker message payload must be a valid ActionsCallToActionsRequest',
        )
    } else {
        const { ghToken, ghLogin, repo } = e.data
        await checkRepoWorkflows(ghToken, ghLogin, repo)
    }
}

self.onmessageerror = e =>
    console.error('worker ghActions.js onmessageerror', e)

async function checkRepoWorkflows(
    ghToken: string,
    ghLogin: string,
    repo: string,
) {
    const workflowContents = await queryViewerRepoWorkflowContents(
        ghToken,
        repo,
    )
    if (workflowContents === RepoNotFound) {
        sendUpdate({
            kind: 'error',
            message: 'repo does not exist',
        })
    } else if (workflowContents === TreeObjectNotFound) {
        sendUpdate({
            kind: 'error',
            message: 'repo does not have .github/workflows',
        })
    } else {
        const workflowContentsEntries = Object.entries(workflowContents)
        if (!workflowContentsEntries.length) {
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
                workflows: workflowContentsEntries.map(([name]) => name),
            })
            const workflows = await Promise.all(
                workflowContentsEntries.map(([name, content]) =>
                    checkWorkflow(ghToken, ghLogin, repo, name, content),
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
