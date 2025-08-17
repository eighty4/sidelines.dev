import { expect, test } from 'bun:test'
import { isValidGitHubRepoUrl } from './ghRepoUrl.ts'

test('isValidGitHubRepoUrl for repo', () => {
    expect(
        isValidGitHubRepoUrl(new URL('https://sidelines.dev/eighty4/c2')),
    ).toBe(true)
})

test('!isValidGitHubRepoUrl for js/css asset', () => {
    expect(
        isValidGitHubRepoUrl(
            new URL('https://sidelines.dev/project/Project-abcdef.css'),
        ),
    ).not.toBe(true)
})

test('!isValidGitHubRepoUrl for longer paths', () => {
    expect(
        isValidGitHubRepoUrl(
            new URL('https://sidelines.dev/lib/assets/home/home-n9tqtjwp.css'),
        ),
    ).not.toBe(true)
})
