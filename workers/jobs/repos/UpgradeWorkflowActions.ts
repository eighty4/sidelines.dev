import { readWorkflowModel } from '@eighty4/model-t'
import { saveRepoCommitReview } from '@sidelines/data/tx/commitReview'
import { registerRepoJob } from '@sidelines/jobs/workers/repos'
import { queryViewerRepoWorkflowContents } from '@sidelines/github/actions/queryViewerRepoWorkflowContents'
import { isFloatingMajorTag } from '@sidelines/github/repository/refs/floatingMajorTag'
import { queryMultipleReposLatestFloatingMajorTag } from '@sidelines/github/repository/refs/queryMultipleReposLatestFloatingMajorTag'
import {
    RepositorySet,
    RepositoryValues,
    type RepoJobExecStatus,
    type RepositoryId,
} from '@sidelines/model'
import { RepoNotFound } from '@sidelines/model/errors'
import replaceActionsVersions from './replaceActionsVersions.ts'

registerRepoJob({ forRepo: upgradeWorkflowActions })

async function upgradeWorkflowActions(
    ghToken: string,
    repo: RepositoryId,
): Promise<RepoJobExecStatus | void> {
    console.log('UpgradeWorkflowActions starting on', repo)
    const workflowContents = await queryViewerRepoWorkflowContents(
        ghToken,
        repo.name,
    )
    if (workflowContents === RepoNotFound) {
        console.error('UpgradeWorkflowActions repo', repo, 'not found')
        return {
            state: 'error',
            error: 'repo does not exist',
            when: new Date(),
        }
    }
    if (Object.keys(workflowContents).length === 0) {
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
            return {
                state: 'error',
                error: path + ' not valid after upgrading github actions',
                when: new Date(),
            }
        }
    }
    const commit = await saveRepoCommitReview({
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
    console.log(
        'UpgradeWorkflowActions',
        repo,
        'saved commit',
        commit.id,
        'to review',
    )
    return {
        state: 'review',
        commitId: commit.id,
        when: new Date(),
    }
}

type WorkflowParsedActions = {
    path: string
    yaml: string
    actionsUsed: RepositorySet
}

function collectActionsUsedByWorkflow(
    workflowYaml: string,
): Array<RepositoryId> | null {
    let readWorkflowResult
    try {
        readWorkflowResult = readWorkflowModel(workflowYaml)
    } catch (e) {
        return null
    }
    if (readWorkflowResult.schemaErrors.length) {
        return null
    }
    const actions = new Array()
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
    if (actions.length) {
        return actions
    } else {
        return null
    }
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
