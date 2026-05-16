import type { RepositoryId } from './repo.ts'

export class RepositorySet {
    #values: RepositoryValues<RepositoryId> = new RepositoryValues()

    constructor(repos?: Array<RepositoryId>) {
        if (repos) {
            this.addAll(repos)
        }
    }

    add(repo: RepositoryId) {
        this.#values.setValue(repo, repo)
    }

    addAll(repos: Array<RepositoryId>) {
        for (const repo of repos) {
            this.add(repo)
        }
    }

    isEmpty(): boolean {
        return this.#values.isEmpty()
    }

    contains(repo: RepositoryId): boolean {
        return this.#values.hasValue(repo)
    }

    toValuesArray(): Array<RepositoryId> {
        return this.#values.toValuesArray()
    }
}

export class RepositoryValues<T> {
    #data: Record<string, Record<string, T | null>> = {}

    static #hasValue(value: any): boolean {
        return !(value === null || typeof value === 'undefined')
    }

    get data(): Record<string, Record<string, T | null>> {
        return this.#data
    }

    getValueByRepoId(repoId: RepositoryId): T | null {
        return this.getValue(repoId.owner, repoId.name)
    }

    getValue(owner: string, name: string): T | null {
        const ownerRepos = this.#data[owner]
        if (ownerRepos) {
            const value = ownerRepos[name]
            if (RepositoryValues.#hasValue(value)) {
                return value
            }
        }
        return null
    }

    hasValue(repo: RepositoryId): boolean {
        const ownerRepos = this.#data[repo.owner]
        if (ownerRepos) {
            return RepositoryValues.#hasValue(ownerRepos[repo.name])
        } else {
            return false
        }
    }

    isEmpty() {
        for (const ownerRepos of Object.values(this.#data)) {
            if (Object.keys(ownerRepos).length) {
                return false
            }
        }
        return true
    }

    removeValue(repo: RepositoryId) {
        const ownerRepos = this.#data[repo.owner]
        if (ownerRepos) {
            ownerRepos[repo.name] = null
        }
    }

    setValue(repo: RepositoryId, value: T) {
        if (!this.#data[repo.owner]) {
            this.#data[repo.owner] = {}
        }
        this.#data[repo.owner][repo.name] = value
    }

    toValuesArray(): Array<T> {
        return Object.values(this.#data).flatMap(ownerRepos =>
            Object.values(ownerRepos).filter(value => value !== null),
        )
    }
}
