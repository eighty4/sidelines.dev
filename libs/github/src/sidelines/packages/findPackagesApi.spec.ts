import { expect, test } from 'bun:test'
import { topYamlList } from './findPackagesApi.ts'

test('topYamlList', () => {
    expect(
        topYamlList('workspace:', '\nworkspace:\n  - abc\n\n'),
    ).toStrictEqual(['abc'])
})

test('topYamlList newline after list key', () => {
    expect(
        topYamlList('workspace:', '\nworkspace:\n\n  - abc\n\n'),
    ).toStrictEqual(['abc'])
})

test('topYamlList newline in the list midst', () => {
    expect(
        topYamlList('workspace:', '\nworkspace:\n  - abc\n  - def\n\n'),
    ).toStrictEqual(['abc', 'def'])
})
