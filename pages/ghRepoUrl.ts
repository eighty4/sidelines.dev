export function isValidGitHubRepoUrl(url: URL): boolean {
    return /^\/[a-z\d][a-z\d-_]{0,37}[a-z\d]?\/[a-z\d._][a-z\d-._]{0,38}[a-z\d._]?(?:\/notes)?$/.test(
        url.pathname,
    )
}
