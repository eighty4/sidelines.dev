export type Repository = {
    owner: string
    name: string
    stargazerCount: number
    updatedAt: string
}

export type RepositoryId = Pick<Repository, 'owner' | 'name'>

export type RepoDefaultBranch = {
    repo: RepositoryId
    defaultBranch: BranchRef
}

export type BranchRef = {
    name: string
    committedDate: Date
    headOid: string
}

export type SyncedRepoDefaultBranch = RepoDefaultBranch & {
    from?: string
    to: string
}
