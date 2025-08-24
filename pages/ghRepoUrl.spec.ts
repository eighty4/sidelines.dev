import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isValidGitHubRepoUrl } from './ghRepoUrl.ts'

test('isValidGitHubRepoUrl for repo', () => {
    assert.equal(
        isValidGitHubRepoUrl(new URL('https://sidelines.dev/eighty4/c2')),
        true,
    )
})

test('!isValidGitHubRepoUrl for js/css asset', () => {
    assert.equal(
        isValidGitHubRepoUrl(
            new URL('https://sidelines.dev/project/Project-abcdef.css'),
        ),
        false,
    )
})

test('!isValidGitHubRepoUrl for longer paths', () => {
    assert.equal(
        isValidGitHubRepoUrl(
            new URL('https://sidelines.dev/lib/assets/home/home-n9tqtjwp.css'),
        ),
        false,
    )
})
