import { UserDataClient } from '@sidelines/data/web'
import { type FC, useMemo } from 'react'
import { ChooseCallToAction } from './ChooseCallToAction.tsx'
import { ChooseProject } from './ChooseProject.tsx'
import { WorkflowRepoSearch } from './WorkflowRepoSearch.ts'

export interface ChooseWorkflowProps {
    ghToken: string
    ghLogin: string
}

export const ChooseWorkflow: FC<ChooseWorkflowProps> = ({
    ghToken,
    ghLogin,
}) => {
    const userData = useMemo(() => new UserDataClient(ghToken, ghLogin), [])
    const workflowSearch = useMemo(() => {
        return new WorkflowRepoSearch(ghToken, ghLogin)
    }, [])

    return (
        <div id="choose-workflow">
            <div className="tr">
                <ChooseProject userData={userData} />
            </div>
            <div className="bl">
                <ChooseCallToAction workflowSearch={workflowSearch} />
            </div>
        </div>
    )
}
