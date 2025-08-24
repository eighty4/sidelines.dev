import assert from 'node:assert/strict'
import { test } from 'node:test'
import { topYamlList } from './findPackagesApi.ts'

test('topYamlList', () => {
    assert.deepEqual(topYamlList('workspace:', '\nworkspace:\n  - abc\n\n'), [
        'abc',
    ])
})

test('topYamlList newline after list key', () => {
    assert.deepEqual(topYamlList('workspace:', '\nworkspace:\n\n  - abc\n\n'), [
        'abc',
    ])
})

test('topYamlList newline in the list midst', () => {
    assert.deepEqual(
        topYamlList('workspace:', '\nworkspace:\n  - abc\n  - def\n\n'),
        ['abc', 'def'],
    )
})
