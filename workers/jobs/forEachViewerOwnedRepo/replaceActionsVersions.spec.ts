import assert from 'node:assert/strict'
import { suite, test } from 'node:test'
import { RepositorySet, RepositoryValues } from '@sidelines/model'
import replaceActionsVersions from './replaceActionsVersions.ts'

suite('replaceActionsVersions', () => {
    test('upgrade returns result', () => {
        const workflow = `\
jobs:
    some-job:
        steps:
            uses: actions/checkout@v3
`
        const action = { owner: 'actions', name: 'checkout' }
        const actionsUsed = new RepositorySet([action])
        const actionsVersions = new RepositoryValues<`v${number}`>()
        actionsVersions.setValue(action, 'v4')
        const result = replaceActionsVersions(
            workflow,
            actionsUsed,
            actionsVersions,
        )
        assert.ok(result?.includes('actions/checkout@v4'))
    })

    test('upgrade returns result', () => {
        const workflow = `\
jobs:
    some-job:
        steps:
            uses: actions/checkout@v4
`
        const action = { owner: 'actions', name: 'checkout' }
        const actionsUsed = new RepositorySet([action])
        const actionsVersions = new RepositoryValues<`v${number}`>()
        actionsVersions.setValue(action, 'v4')
        const result = replaceActionsVersions(
            workflow,
            actionsUsed,
            actionsVersions,
        )
        assert.ok(result === null)
    })
})
