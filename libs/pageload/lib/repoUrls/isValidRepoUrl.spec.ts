import assert from 'node:assert/strict'
import { test } from 'node:test'
import isValidRepoUrl from './isValidRepoUrl.api.ts'

test('isValidGitHubRepoUrl for repo', () => {
    assert.equal(
        isValidRepoUrl(new URL('https://sidelines.dev/eighty4/c2')),
        true,
    )
})

test('!isValidRepoUrl for js/css asset', () => {
    assert.equal(
        isValidRepoUrl(
            new URL('https://sidelines.dev/project/Project-abcdef.css'),
        ),
        false,
    )
})

test('!isValidRepoUrl for longer paths', () => {
    assert.equal(
        isValidRepoUrl(
            new URL('https://sidelines.dev/lib/assets/home/home-n9tqtjwp.css'),
        ),
        false,
    )
})
