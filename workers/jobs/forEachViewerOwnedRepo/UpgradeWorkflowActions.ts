import { readWorkflowModel } from '@eighty4/model-t'
import { saveRepoCommitReview } from '@sidelines/data/tx/commitReview'
import { NotFoundError } from '@sidelines/github'
import { queryViewerRepoWorkflowContents } from '@sidelines/github/actions/queryViewerRepoWorkflowContents'
import { isFloatingMajorTag } from '@sidelines/github/repository/refs/floatingMajorTag'
import { queryMultipleReposLatestFloatingMajorTag } from '@sidelines/github/repository/refs/queryMultipleReposLatestFloatingMajorTag'
import {
    RepositorySet,
    RepositoryValues,
    type RepositoryId,
} from '@sidelines/model'
import { ExecJobWorker } from '../ExecJobWorker.ts'
import replaceActionsVersions from './replaceActionsVersions.ts'

declare const self: DedicatedWorkerGlobalScope

const w = new ExecJobWorker({
    forEachViewerOwnedRepo: upgradeWorkflowActions,
})

self.onmessage = w.onmessage

async function upgradeWorkflowActions(ghToken: string, repo: RepositoryId) {
    console.log('UpgradeWorkflowActions starting on', repo)
    const workflowContents = await queryViewerRepoWorkflowContents(
        ghToken,
        repo.name,
    )
    if (workflowContents instanceof NotFoundError) {
        console.log('UpgradeWorkflowActions', repo, 'no workflows found')
        return
    }
    const actionsUsed = new RepositorySet()
    const workflows: Array<WorkflowParsedActions> = Object.entries(
        workflowContents,
    )
        .map(([path, yaml]) => {
            const foundActions = collectActionsUsedByWorkflow(yaml)
            if (foundActions) {
                actionsUsed.addAll(foundActions)
                return {
                    path,
                    yaml,
                    actionsUsed: new RepositorySet(foundActions),
                }
            } else {
                return null
            }
        })
        .filter(wf => wf !== null)
    if (actionsUsed.isEmpty()) {
        console.log('UpgradeWorkflowActions', repo, 'no actions used found')
        return
    }
    const actionsUpToDateVersions =
        await queryMultipleReposLatestFloatingMajorTag(
            ghToken,
            actionsUsed.toValuesArray(),
        )
    const upgraded = upgradeOutOfDateActions(workflows, actionsUpToDateVersions)
    if (!upgraded.length) {
        console.log('UpgradeWorkflowActions', repo, 'no actions upgrades found')
        return
    }
    for (const { path, yaml } of upgraded) {
        if (readWorkflowModel(yaml).schemaErrors.length > 0) {
            // todo job logging to continue to upgrade commit review
            throw Error(path + ' not valid after upgrading github actions')
        }
    }
    await saveRepoCommitReview({
        repo,
        branch: {
            name: 'main',
            headOid: 'abcdefg',
        },
        commitMessage: 'Upgrade GitHub actions',
        additions: upgraded.map(wf => ({
            dirpath: '.github/workflows',
            filename: wf.path.substring(wf.path.lastIndexOf('/') + 1),
            content: wf.yaml,
        })),
    })
    console.log('upgradeWorkflowActions job on', repo, 'saved commit to review')
}

type WorkflowParsedActions = {
    path: string
    yaml: string
    actionsUsed: RepositorySet
}

function collectActionsUsedByWorkflow(
    workflowYaml: string,
): Array<RepositoryId> | null {
    const actions = new Array()
    let readWorkflowResult
    try {
        readWorkflowResult = readWorkflowModel(workflowYaml)
    } catch (e) {
        return null
    }
    if (readWorkflowResult.schemaErrors.length) {
        return null
    }
    for (const [_jobName, jobModel] of Object.entries(
        readWorkflowResult.workflow.jobs,
    )) {
        if (jobModel.__KIND === 'steps') {
            for (const jobStep of jobModel.steps) {
                if (jobStep.__KIND === 'uses') {
                    if (jobStep.uses.__KIND === 'repository') {
                        if (isFloatingMajorTag(jobStep.uses.ref)) {
                            actions.push({
                                owner: jobStep.uses.owner,
                                name: jobStep.uses.repo,
                            })
                        }
                    }
                }
            }
        }
    }
    return actions
}

function upgradeOutOfDateActions(
    workflows: Array<WorkflowParsedActions>,
    actionsUpToDateVersions: RepositoryValues<`v${number}`>,
): Array<WorkflowParsedActions> {
    return workflows
        .map(wf => {
            const result = replaceActionsVersions(
                wf.yaml,
                wf.actionsUsed,
                actionsUpToDateVersions,
            )
            if (result === null) {
                return null
            } else {
                wf.yaml = result
            }
            return wf
        })
        .filter(wf => wf !== null)
}
