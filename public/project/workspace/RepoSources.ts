import { getRepoContent, getRepoDirListing } from '@eighty4/sidelines-github'
import { BehaviorSubject, map, Observable } from 'rxjs'

type RepoTreePath = {
  repo: string
  // abs path from repo root excluding name of file or dir
  dirpath: string
  // name of file or dir
  name: string
}

export type RepoDir = RepoTreePath & {
  type: 'dir'
}

export type RepoFile = RepoTreePath & {
  // abs path from repo root including filename
  path: string
  // size in bytes of git object
  size: number
} & ({
  type: 'file-ls'
  status: 'not-loaded' | 'loading'
} | {
  type: 'file-cat'
  status: 'dirty' | 'synced' | 'syncing' | 'error'
  content: string
})

export type RepoDirListing = {
  status: 'loading'
  dirpath: string
  cached: Array<string> | null
} | {
  status: 'listed'
  dirpath: string
  files: Array<RepoDir | RepoFile>
}

type _RepoSources = {
  openFile?: {
    repo: string
    dirpath: string
    name: string
  }
  repos: Record<string, Record<string, RepoDirListing>>
}

export class RepoSources {
  readonly #state: BehaviorSubject<_RepoSources>
  readonly #ghToken: string

  constructor(ghToken: string, repo: string) {
    this.#ghToken = ghToken
    const repos: _RepoSources['repos'] = {}
    repos['.sidelines'] = {}
    repos[repo] = {}
    this.#state = new BehaviorSubject({ repos })
  }

  ls(repo: string, dirpath: string = ''): Observable<RepoDirListing> {
    if (typeof this.#state.getValue().repos[repo][dirpath] === 'undefined') {
      this.#ls(repo, dirpath).then(ls => {
        lsCacheWrite(repo, dirpath, ls)
        this.#mutateDirListing(repo, dirpath, {
          status: 'listed',
          dirpath,
          files: ls,
        })
      })
    }
    return this.#state.asObservable().pipe(map((s) => s.repos[repo][dirpath]))
  }

  get openFile(): Observable<RepoFile | null> {
    return this.#state.asObservable().pipe(map(s => {
      if (s.openFile) {
        const dirListing = s.repos[s.openFile.repo][s.openFile.dirpath]
        if (dirListing.status === 'listed') {
          const f = dirListing.files.find(f => f.type !== 'dir' && f.name === s.openFile!.name)
          if (f && f.type !== 'dir') {
            return f
          }
        }
      }
      return null
    }))
  }

  set openFile(openFile: RepoFile | null) {
    if (openFile?.status === 'not-loaded') {
      this.#loadFileContent(openFile.repo, openFile.dirpath, openFile.name)
    }
    const s = this.#state.getValue()
    this.#state.next({
      ...s,
      openFile: openFile === null ? undefined : {
        repo: openFile.repo,
        dirpath: openFile.dirpath,
        name: openFile.name,
      }
    })
  }

  async #ls(repo: string, dirpath: string): Promise<Array<RepoDir | RepoFile>> {
    this.#mutateDirListing(repo, dirpath, {
      status: 'loading',
      dirpath,
      cached: lsCacheRead(repo, dirpath),
    })
    return (await getRepoDirListing(this.#ghToken, repo, dirpath)).map(rc => {
      switch (rc.type) {
        case 'dir':
          return {
            type: 'dir',
            repo,
            dirpath,
            name: rc.name,
          }
        case 'file':
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

  #loadFileContent(repo: string, dirpath: string, name: string) {
    this.#mutateFile(repo, dirpath, name, (f) => ({
      ...f,
      status: 'loading',
    } as RepoFile))
    getRepoContent(this.#ghToken, repo, `${dirpath}/${name}`).then(content => {
      this.#mutateFile(repo, dirpath, name, (f) => ({
        ...f,
        type: 'file-cat',
        status: 'synced',
        content: content || '',
      } as RepoFile))
    })
  }

  #mutateDirListing(repo: string, dirpath: string, dirListing: RepoDirListing) {
    const s = this.#state.getValue()
    this.#state.next({
      openFile: s.openFile,
      repos: {
        ...s.repos,
        [repo]: {
          ...s.repos[repo],
          [dirpath]: dirListing,
        },
      },
    })
  }

  #mutateFile(repo: string, dirpath: string, name: string, fn: (f: RepoFile) => RepoFile) {
    const dirListing = this.#state.getValue().repos[repo][dirpath]
    if (dirListing.status === 'listed') {
      const file = dirListing.files.find(f => f.name === name)
      if (file && file.type !== 'dir') {
        dirListing.files.splice(dirListing.files.indexOf(file), 1, fn(file))
        return this.#mutateDirListing(repo, dirpath, {
          ...dirListing,
          files: [...dirListing.files],
        })
      }
    }
    throw new Error(`mutate ${dirpath}/${name} could not find file`)
  }
}

function lsCacheWrite(repo: string, dirpath: string, ls: Array<RepoDir | RepoFile>) {
  localStorage.setItem(lsCacheKey(repo, dirpath), JSON.stringify(ls.map(f => f.name)))
}

function lsCacheRead(repo: string, dirpath: string): Array<string> | null {
  const read = localStorage.getItem(lsCacheKey(repo, dirpath))
  return read === null ? null : JSON.parse(read)
}

function lsCacheKey(repo: string, dirpath: string): string {
  return `sld.ls ${repo}/${dirpath}`
}
