import { getGhTokenCookie } from '@sidelines/data/cookie'
import type { RepoWatches } from '@sidelines/model'
import { onDomInteractive } from '@sidelines/pageload/ready'
import { type FC, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { WatchesApi } from 'Sidelines.dev/workers/watches/WatchesApi'
import { FileBrowser } from './FileBrowser.tsx'
import { FilePreview } from './FilePreview.tsx'
import { PathSearchInput, type SearchLocation } from './PathSearchInput.tsx'
import { WatchListing } from './WatchListing.tsx'
import { WatchSplash } from './WatchSplash.tsx'
import { WatchToggle } from './WatchToggle.tsx'

type WatchesProps = {
    ghToken: string
}

const Watches: FC<WatchesProps> = ({ ghToken }) => {
    const watchesApi = useMemo(() => new WatchesApi(), [])
    const [watches, setWatches] = useState<Array<RepoWatches> | 'loading'>(
        'loading',
    )
    const [searchLocation, setSearchLocation] = useState<
        SearchLocation | null | 'error'
    >(null)
    const [selectedPath, setSelectedPath] = useState<string | null>(null)

    // when searchLocation, watchFocus tracks file selection in FileBrowser
    // const [watchFocus, setWatchFocus] = useState<string | null>(null)

    useEffect(() => {
        watchesApi.getAllWatches().then(setWatches)
    }, [])

    useEffect(() => {
        console.log(watches)
    }, [watches])

    useEffect(() => {
        if (searchLocation && searchLocation !== 'error') {
            watchesApi.getRepoWatches(searchLocation.repo).then(paths => {
                if (watches === 'loading') throw Error()
                const repo = searchLocation.repo
                const nameWithOwner = `${repo.owner}/${repo.name}`
                setWatches({ ...watches, [nameWithOwner]: { repo, paths } })
            })
        }
    }, [searchLocation])

    function onSearchLocation(update: SearchLocation | null | 'error') {
        console.log('onSearchLocation', update)
        setSearchLocation(update)
    }

    function onFileSelection(file: string) {
        console.log('file', file)
        setSelectedPath(file)
    }

    // todo memoize array and clear every render to optimize allocations
    // content.length = 0
    const content = [
        <PathSearchInput
            ghToken={ghToken}
            onSearchLocation={onSearchLocation}
        />,
    ]

    if (searchLocation === null || searchLocation === 'error') {
        content.push(<WatchSplash />)
    } else {
        if (searchLocation.object.kind === 'tree') {
            content.push(
                <FileBrowser
                    objects={searchLocation.object.entries}
                    onFileSelection={onFileSelection}
                />,
            )
        }
        if (searchLocation.object.kind === 'blob' || selectedPath) {
            const onToggle = () =>
                watchesApi.createWatch(
                    searchLocation.repo,
                    searchLocation.path!,
                )
            content.push(<WatchToggle hasWatch={false} onToggle={onToggle} />)
        }
        if (searchLocation.object.kind === 'blob') {
            content.push(<FilePreview />)
        }
    }

    if (watches !== 'loading' && watches.length) {
        content.push(<WatchListing watches={watches} watchesApi={watchesApi} />)
    }

    return <div id="watches">{...content}</div>
}

onDomInteractive(() => {
    const ghToken = getGhTokenCookie(document.cookie)
    if (ghToken === null) {
        location.assign('/logout')
    } else {
        createRoot(document.getElementById('root')!).render(
            <Watches ghToken={ghToken} />,
        )
    }
})

if (dank.IS_DEV) {
    function addWatches(count: 5) {
        const stock = [
            'bytecodealliance/wasm-tools/crates/wasm-metadata',
            'bytecodealliance/wit-bindgen/crates/core/src',
            'chromium/chromium/remoting',
            'flutter/flutter/engine/src/flutter/vulkan',
            'flutter/flutter/packages/flutter/lib/src/rendering',
            'torvalds/linux/ipc',
            'torvalds/linux/net',
            'torvalds/linux/io_uring',
            'crate-ci/cargo-release/src/steps',
            'rust-lang/rust/library/std/src',
            'dart-lang/sdk/runtime/vm/heap',
            'eighty4/l3/Cargo.toml',
            'eighty4/l3/CHANGELOG.md',
            'eighty4/l3/l3_cli/CHANGELOG.md',
            'eighty4/maestro/Cargo.toml',
            'eighty4/maestro/CHANGELOG.md',
            'eighty4/l3/l3_cli/CHANGELOG.md',
        ]
        const results: Record<string, RepoWatches> = {}
        for (const w of shuffleyKnuthy(stock).slice(0, count)) {
            const wS = w.split('/')
            const nameWithOwner = `${wS[0]}/${wS[1]}`
            if (!results[nameWithOwner]) {
                results[nameWithOwner] = {
                    repo: { owner: wS[0], name: wS[1] },
                    paths: [],
                }
            }
            results[nameWithOwner].paths.push(wS.slice(2).join('/'))
        }
        const api = new WatchesApi()
        for (const w of Object.values(results)) {
            for (const p of w.paths) {
                api.createWatch(w.repo, p)
            }
        }
    }

    function shuffleyKnuthy(array: Array<string>) {
        let currentIndex = array.length,
            randomIndex
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex)
            currentIndex--
            ;[array[currentIndex], array[randomIndex]] = [
                array[randomIndex],
                array[currentIndex],
            ]
        }

        return array
    }

    ;(globalThis as any)['addWatches'] = addWatches
}
