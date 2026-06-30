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

export type BranchRef = {
    name: string
    committedDate: Date
    headOid: string
}
