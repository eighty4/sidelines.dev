import type { BranchRef, RepositoryId } from './repo.ts'

export type RepoCommitReview = {
    id: string
    commit: RepoCommitInputs
}

export type RepoCommitInputs = {
    repo: RepositoryId
    commitMessage: string
    branch: Pick<BranchRef, 'name' | 'headOid'>
    additions?: Array<RepoCommitAddition>
    deletions?: Array<RepoCommitDeletion>
}

export type RepoCommitAddition = {
    dirpath: string
    filename: string
    content: string
}

export type RepoCommitDeletion = {
    dirpath: string
    filename: string
}
