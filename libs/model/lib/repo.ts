export type RepoNameWithOwner = `${string}/${string}`

export type Repository = {
    owner: string
    name: string
    stargazerCount: number
    updatedAt: string
}

export type RepositoryId = Pick<Repository, 'owner' | 'name'>

export function joinRepoName(repo: RepositoryId): RepoNameWithOwner {
    return `${repo.owner}/${repo.name}`
}

export function splitRepoName(repo: RepoNameWithOwner): RepositoryId {
    const [owner, name] = repo.split('/', 2)
    return { owner, name }
}

// combines a repo's branch name with oid
// does not include other ref or history data by design
// features based on any more of a repo's ref or history graph should define new APIs
export type BranchRef = {
    name: string
    headOid: string
}
