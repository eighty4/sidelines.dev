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

export type RepoWatches = { repo: RepositoryId; paths: Array<string> }

export type RepositoryPackage = Package<Language> | PackageWorkspace<Language>

export type PackageWorkspace<L extends Language> = {
    language: L
    path?: string
    configFile: LanguageConfigFile<L>
    packages: Array<Package<L>>
    root?: Package<L>
}

// todo extend with language specific package data
//  dart -> flutter?
//  js -> package manager | runtime
// todo parse description config filesº
export type Package<L extends Language> = {
    name: string
    version: string
    language: L
    path?: string
    configFile: LanguageConfigFile<L>
    produces?: Array<PackageOutput>
    private?: boolean
}

const LanguageConfigFiles = {
    dart: 'pubspec.yaml',
    go: 'go.mod',
    js: 'package.json',
    rust: 'Cargo.toml',
    zig: 'build.zig',
} as const

export function languageOfConfigFile(filename: string): Language {
    for (const [language, configFile] of Object.entries(LanguageConfigFiles)) {
        if (filename === configFile) {
            return language as Language
        }
    }
    throw Error(filename + ' is not a supported language filename')
}

export type Language = keyof typeof LanguageConfigFiles

export type LanguageConfigFile<L extends Language> =
    (typeof LanguageConfigFiles)[L]

export type PackageOutput = {
    kind: 'bin' | 'lib'
    // | 'app | 'web' | 'wasm' | 'wasip2' | 'docker-image'
}

// RepositoryObject excludes path to obj in repo
export type RepositoryObject =
    | {
          type: 'dir'
          name: string
      }
    | {
          type: 'file-cat'
          name: string
          size: number
          content: string
      }
    | {
          type: 'file-ls'
          name: string
          size: number
      }

export class RepositoryValues<T> {
    #data: Record<string, Record<string, T | null>> = {}

    static #hasValue(value: any): boolean {
        return !(value === null || typeof value === 'undefined')
    }

    get data(): Record<string, Record<string, T | null>> {
        return this.#data
    }

    getValue(repo: RepositoryId): T | null {
        const ownerRepos = this.#data[repo.owner]
        if (ownerRepos) {
            const value = ownerRepos[repo.name]
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
}
