import { createJsonCache, type SessionCache } from '@sidelines/data/web'
import type { RepositoryId } from '@sidelines/model'
import { BehaviorSubject, map, Observable } from 'rxjs'
import type { UserDataClient } from '../../../workers/UserDataClient.ts'

type RepoTreePath = {
    // abs path from repo root excluding name of file or dir
    dirpath: string
    // name of file or dir
    name: string
    repo: RepositoryId
}

export type RepoDir = RepoTreePath & { type: 'dir' }

export type RepoFile = RepoTreePath & {
    // abs path from repo root including filename
    path: string
    // size in bytes of git object
    size: number
} & (
        | {
              type: 'file-ls'
              // status of loading git object blob from HEAD
              status: 'not-loaded' | 'loading'
          }
        | {
              type: 'file-cat'
              // status of syncing local changes to github
              status: 'dirty' | 'synced' | 'syncing' | 'error'
              content: string
          }
    )

export type RepoDirListing = {
    dirpath: string
    repo: RepositoryId
} & (
    | {
          status: 'loading'
          // placeholder names used from ls start to resolve
          cached: Array<string> | null
      }
    | {
          status: 'listed'
          // ls result of git objects at dirpath
          files: Array<RepoDir | RepoFile>
      }
    | {
          status: 'repo-does-not-exist'
      }
)

type _RepoSources = {
    openFile?: {
        repo: RepositoryId
        dirpath: string
        name: string
    }
    // repos[owner][name][dirpath]
    repos: Record<string, Record<string, Record<string, RepoDirListing>>>
}

function createInitState(ghLogin: string, repo: RepositoryId): _RepoSources {
    const repos: _RepoSources['repos'] = {}
    repos[ghLogin] = {
        ['.sidelines']: {},
    }
    if (!repos[repo.owner]) {
        repos[repo.owner] = {}
    }
    repos[repo.owner][repo.name] = {}
    return { repos }
}

export class RepoSources {
    readonly #cacheOpenFile: SessionCache<RepoTreePath>
    readonly #state: BehaviorSubject<_RepoSources>
    readonly #userData: UserDataClient

    constructor(repo: RepositoryId, userData: UserDataClient) {
        this.#state = new BehaviorSubject(
            createInitState(userData.ghLogin, repo),
        )
        this.#cacheOpenFile = openFileCache(repo)
        this.#userData = userData
        this.#loadLastOpenFile().then().catch()
    }

    async #loadLastOpenFile() {
        const read = this.#cacheOpenFile.read()
        if (read) {
            const subscription = this.ls(read.repo, read.dirpath).subscribe(
                ls => {
                    if (ls.status === 'listed') {
                        subscription.unsubscribe()
                        const found = ls.files.find(f => f.name === read.name)
                        if (found && found.type !== 'dir') {
                            this.openFile = found
                        }
                    }
                },
            )
        }
    }

    ls(repo: RepositoryId, dirpath: string = ''): Observable<RepoDirListing> {
        if (
            typeof this.#state.getValue().repos[repo.owner][repo.name][
                dirpath
            ] === 'undefined'
        ) {
            this.#ls(repo, dirpath).then(ls => {
                if (ls === 'repo-not-found') {
                    this.#mutateDirListing(repo, dirpath, {
                        status: 'repo-does-not-exist',
                        repo,
                        dirpath,
                    })
                } else {
                    lsCacheWrite(repo, dirpath, ls)
                    this.#mutateDirListing(repo, dirpath, {
                        status: 'listed',
                        repo,
                        dirpath,
                        files: ls,
                    })
                }
            })
        }
        return this.#state
            .asObservable()
            .pipe(map(s => s.repos[repo.owner][repo.name][dirpath]))
    }

    get openFile(): Observable<RepoFile | null> {
        return this.#state.asObservable().pipe(
            map(s => {
                if (s.openFile) {
                    const dirListing =
                        s.repos[s.openFile.repo.owner][s.openFile.repo.name][
                            s.openFile.dirpath
                        ]
                    if (dirListing.status === 'listed') {
                        const f = dirListing.files.find(
                            f =>
                                f.type !== 'dir' && f.name === s.openFile!.name,
                        )
                        if (f && f.type !== 'dir') {
                            return f
                        }
                    }
                }
                return null
            }),
        )
    }

    set openFile(openFile: RepoFile | null) {
        if (openFile !== null) {
            this.#cacheOpenFile.write({
                dirpath: openFile.dirpath,
                name: openFile.name,
                repo: openFile.repo,
            })
        }
        if (openFile?.status === 'not-loaded') {
            this.#loadFileContent(
                openFile.repo,
                openFile.dirpath,
                openFile.name,
            )
        }
        const s = this.#state.getValue()
        this.#state.next({
            ...s,
            openFile:
                openFile === null
                    ? undefined
                    : {
                          repo: openFile.repo,
                          dirpath: openFile.dirpath,
                          name: openFile.name,
                      },
        })
    }

    async #ls(
        repo: RepositoryId,
        dirpath: string,
    ): Promise<Array<RepoDir | RepoFile> | 'repo-not-found'> {
        this.#mutateDirListing(repo, dirpath, {
            status: 'loading',
            repo,
            dirpath,
            cached: lsCacheRead(repo, dirpath),
        })
        const contents = await this.#userData.repoListing(repo, dirpath)
        if (contents === 'repo-not-found') {
            return contents
        }
        return contents.map(rc => {
            switch (rc.type) {
                case 'dir':
                    return {
                        type: 'dir',
                        repo,
                        dirpath,
                        name: rc.name,
                    }
                case 'file-cat':
                case 'file-ls':
                    return {
                        type: 'file-ls',
                        repo,
                        dirpath,
                        path: `${dirpath}/${rc.name}`,
                        name: rc.name,
                        size: rc.size,
                        status: 'not-loaded',
                    }
            }
        })
    }

    #loadFileContent(repo: RepositoryId, dirpath: string, filename: string) {
        this.#mutateFile(
            repo,
            dirpath,
            filename,
            f =>
                ({
                    ...f,
                    status: 'loading',
                }) as RepoFile,
        )
        this.#userData.repoContent(repo, dirpath, filename).then(content => {
            this.#mutateFile(
                repo,
                dirpath,
                filename,
                f =>
                    ({
                        ...f,
                        type: 'file-cat',
                        status: 'synced',
                        content: content || '',
                    }) as RepoFile,
            )
        })
    }

    #mutateDirListing(
        repo: RepositoryId,
        dirpath: string,
        dirListing: RepoDirListing,
    ) {
        const s = this.#state.getValue()
        this.#state.next({
            openFile: s.openFile,
            repos: {
                ...s.repos,
                [repo.owner]: {
                    ...s.repos[repo.owner],
                    [repo.name]: {
                        ...s.repos[repo.owner][repo.name],
                        [dirpath]: dirListing,
                    },
                },
            },
        })
    }

    #mutateFile(
        repo: RepositoryId,
        dirpath: string,
        name: string,
        fn: (f: RepoFile) => RepoFile,
    ) {
        const dirListing =
            this.#state.getValue().repos[repo.owner][repo.name][dirpath]
        if (dirListing.status === 'listed') {
            const file = dirListing.files.find(f => f.name === name)
            if (file && file.type !== 'dir') {
                dirListing.files.splice(
                    dirListing.files.indexOf(file),
                    1,
                    fn(file),
                )
                return this.#mutateDirListing(repo, dirpath, {
                    ...dirListing,
                    files: [...dirListing.files],
                })
            }
        }
        throw new Error(`mutate ${dirpath}/${name} could not find file`)
    }
}

function lsCacheWrite(
    repo: RepositoryId,
    dirpath: string,
    ls: Array<RepoDir | RepoFile>,
) {
    localStorage.setItem(
        lsCacheKey(repo, dirpath),
        JSON.stringify(ls.map(f => f.name)),
    )
}

function lsCacheRead(
    repo: RepositoryId,
    dirpath: string,
): Array<string> | null {
    const read = localStorage.getItem(lsCacheKey(repo, dirpath))
    return read === null ? null : JSON.parse(read)
}

function lsCacheKey(repo: RepositoryId, dirpath: string): string {
    return `sld.ls ${repo.owner}/${repo.name}/${dirpath}`
}

function openFileCache(repo: RepositoryId): SessionCache<RepoTreePath> {
    return createJsonCache<RepoTreePath>(localStorage, openFileCacheKey(repo))
}

function openFileCacheKey(repo: RepositoryId): string {
    return `sld.open ${repo.owner}/${repo.name}`
}
