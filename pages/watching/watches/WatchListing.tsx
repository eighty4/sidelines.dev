import type { RepositoryId, RepoWatches } from '@sidelines/model'
import { type FC, useEffect, useState } from 'react'
import type { WatchesApi } from 'Sidelines.dev/workers/watches/WatchesApi'
import { GitHubAvatar } from './GitHubAvatar.tsx'
import { AlarmOff } from '../WatchSvgs.tsx'

export type WatchIndexProps = {
    watches: Array<RepoWatches>
    watchesApi: WatchesApi
}

export const WatchListing: FC<WatchIndexProps> = ({ watches, watchesApi }) => {
    const [count, setCount] = useState<number>(0)
    const [filter, setFilter] = useState<string | null>(null)
    const [removed, setRemoved] = useState<
        Array<{ repo: RepositoryId; path: string }>
    >([])

    useEffect(() => {
        console.log('WatchListing', watches)
        setCount(watches.reduce((c, v) => c + v.paths.length, 0))
    }, [watches])

    function onChangeFilter(e: any) {
        setFilter(e.target.value.length ? e.target.value : null)
    }

    function turnOffWatch(repo: RepositoryId, path: string) {
        watchesApi.deleteWatch(repo, path)
        setRemoved([...removed, { repo, path }])
    }

    return (
        <div id="watch-ls">
            <div id="watch-ls-header">
                <h3 className="header">Your watches</h3>
                {count > 10 && (
                    <input
                        className="search"
                        type="search"
                        placeholder="filter by repo or path"
                        onChange={onChangeFilter}
                    ></input>
                )}
            </div>
            <div id="watch-ls-body">
                {filterAndMap(watches, filter, removed).map(w => {
                    return (
                        <div
                            className="watch"
                            key={`${w.repo.owner}/${w.repo.name}/${w.path}`}
                        >
                            <a
                                href={`https://github.com/${w.repo.owner}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <GitHubAvatar login={w.repo.owner} size={18} />
                            </a>
                            <span className="repo">
                                <a
                                    className="link"
                                    href={`https://github.com/${w.repo.owner}/${w.repo.name}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {w.repo.owner}/{w.repo.name}
                                </a>
                            </span>
                            <span className="path">
                                <a
                                    className="link"
                                    href={`https://github.com/${w.repo.owner}/${w.repo.name}/commits/main/${w.path}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {w.path.split(/(\/)/).map((pp, i) => {
                                        if (pp !== '/') {
                                            return pp
                                        }
                                        const c =
                                            pp === '/' ? 'slash' : 'subpath'
                                        return (
                                            <span key={i} className={c}>
                                                {pp}
                                            </span>
                                        )
                                    })}
                                </a>
                                <AlarmOff
                                    className="drop"
                                    fill="#e99"
                                    height={16}
                                    width={16}
                                    onClick={() => turnOffWatch(w.repo, w.path)}
                                />
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function filterAndMap(
    watches: Array<RepoWatches>,
    filter: string | null,
    removed: Array<{ repo: RepositoryId; path: string }>,
): Array<{ repo: RepositoryId; path: string }> {
    const result: Array<{ repo: RepositoryId; path: string }> = []
    for (const { repo, paths } of watches) {
        for (const path of paths) {
            if (!removed.some(rm => match(repo, path, rm))) {
                result.push({ repo, path })
            }
        }
    }
    return filter === null ? result : applyFilter(result, filter)
}

function match(
    repo: RepositoryId,
    path: string,
    other: { repo: RepositoryId; path: string },
): boolean {
    return (
        repo.owner === other.repo.owner &&
        repo.name === other.repo.name &&
        path === other.path
    )
}

function applyFilter(
    watches: Array<{ repo: RepositoryId; path: string }>,
    filter: string,
): Array<{ repo: RepositoryId; path: string }> {
    const f = filter.toLocaleLowerCase()
    return watches.filter(w => {
        const o = w.repo.owner.toLocaleLowerCase()
        const n = w.repo.name.toLocaleLowerCase()
        const p = w.path.toLocaleLowerCase()
        return `${o}/${n}/${p}`.includes(f)
    })
}
