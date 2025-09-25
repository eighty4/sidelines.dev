import { queryRepoObject, type RepoObject } from '@sidelines/github'
import type { RepositoryId } from '@sidelines/model'
import {
    type FC,
    type FocusEvent,
    type KeyboardEvent,
    type MouseEvent,
    type ReactElement,
    useEffect,
    useRef,
    useState,
} from 'react'

// todo resolving tokens needs to query graphql

// todo tokenize in progress typing, so input.value can match autocomplete casing
//  typing `ch` with autocomplete `CHANGELOG.md` will display `CH`
//  without losing the casing of the input's value
// todo show error line if path typing does not match an autocomplete
// todo show error line as squiggly svg path
// todo show loading line with animation

export type SearchLocation = {
    repo: RepositoryId
    path: string
    object: RepoObject
}

export type SearchLocationUpdate = SearchLocation | null | 'error'

export type PathSearchInputProps = {
    ghToken: string
    // cb with null when clearing location
    onSearchLocation: (location: SearchLocationUpdate) => void
}

type ResolvingRepo =
    | {
          mode: 'typing'
          repo: RepositoryId
          exists?: boolean
          loading: false | AbortController | 'error'
      }
    | {
          mode: 'pasting'
          repo: RepositoryId
          path: string
          exists?: boolean
          loading: false | AbortController | 'error'
      }

type ResolvingObject =
    | {
          loading: AbortController
      }
    | {
          loading: false
          error: boolean
          exists: boolean
      }
    | UnresolvedTreeObject
    | ResolvedObject

type UnresolvedTreeObject = {
    loading: 'pending'
}

type ResolvedObject = {
    loading: false
    error: false
    exists: true
    resolved: RepoObject
}

function isResolved(object?: ResolvingObject): object is ResolvedObject {
    return (
        !!object &&
        object.loading === false &&
        object.exists === true &&
        object.error === false
    )
}

function resolvedObject(resolved: RepoObject): ResolvedObject {
    return { loading: false, error: false, exists: true, resolved }
}

function join(root: string, subpath: string): string {
    return root.length ? root + '/' + subpath : subpath
}

function collectResolved(
    objects: Record<string, ResolvingObject>,
    root: string,
    object: RepoObject,
) {
    objects[root] = resolvedObject(object)
    if (object.kind === 'tree') {
        for (const entry of object.entries) {
            if (entry.kind === 'blob') {
                objects[join(root, entry.name)] = resolvedObject(entry)
            } else if (entry.kind === 'tree') {
                objects[join(root, entry.name)] = { loading: 'pending' }
            }
        }
    }
}

type InputToken = {
    kind: 'repo' | 'path' | 'seperator'
    start: number
    end: number
    value: string
    width: number
}

function abort(loadable: ResolvingRepo | ResolvingObject) {
    if (loadable.loading instanceof AbortController) {
        loadable.loading.abort()
    }
}

function isAbort(e: any) {
    return e instanceof DOMException && e.name === 'AbortError'
}

export const PathSearchInput: FC<PathSearchInputProps> = ({
    ghToken,
    onSearchLocation,
}) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const sizingRef = useRef<HTMLDivElement>(null)
    const [inputFocus, setInputFocus] = useState<boolean>(false)
    const [repoState, setRepoState] = useState<ResolvingRepo | null>(null)

    // map of repo objects paths to loading or loaded object
    const objectStateRef = useRef<Record<string, ResolvingObject>>({})

    const [tokens, setTokens] = useState<Array<InputToken>>([])
    const [autocompletePaths, setAutocompletePaths] =
        useState<Array<string> | null>(null)
    const [autocompleteFocus, setAutocompleteFocus] = useState<number | null>(
        null,
    )
    const [autocompleteHover, setAutocompleteHover] = useState<boolean>(false)

    useEffect(() => console.log('repo', repoState), [repoState])
    useEffect(() => console.log('tokens', ...(tokens || [])), [tokens])

    function debugPrint(msg: string, extra?: Record<string, any>) {
        console.debug(
            msg,
            JSON.stringify(
                {
                    untokenized: tokens.length
                        ? inputRef.current!.value.substring(tokens.at(-1)!.end)
                        : null,
                    tokens: tokens!.map(t => t.value).join(''),
                    path: buildPathFromTokens(tokens!),
                    objects: Object.keys(objectStateRef.current),
                    ...(extra || {}),
                },
                null,
                4,
            ),
        )
    }

    function reset() {
        debugPrint('reset', { stack: new Error().stack })
        if (repoState !== null) abort(repoState)
        Object.values(objectStateRef.current).forEach(abort)
        setRepoState(null)
        objectStateRef.current = {}
        setTokens([])
        resetAutocomplete()
    }

    function resetAutocomplete() {
        setAutocompleteFocus(null)
        setAutocompletePaths(null)
        setAutocompleteHover(false)
    }

    function onInput(e: any) {
        const value = e.target.value
        const c = value.at(-1)
        if (e.target.selectionStart !== e.target.selectionEnd) {
            throw Error(
                'bad assumption that multichar selection range > keydown > input > keyup would resolve to the cursor location after typing and would have equal selection start and end indices',
            )
        }
        if (e.target.selectionEnd === value.length) {
            if (tokens?.length && repoState && repoState.mode === 'typing') {
                const prev = tokens.at(-1)!
                if (value.length > prev.end) {
                    // cursor is typing at end of text input so lets resolve token if / or update autcomplete
                    if (c === '/') {
                        console.log('input / parsing in progress token')
                        resolveTokenFromTyping()
                    } else {
                        console.log('input updating autocomplete')
                        updateAutocompletePaths()
                    }
                } else if (prev.end === value.length) {
                    // cursor at end of text input presumably after deleting a character
                    resetAutocomplete()
                } else {
                    // cursor at end of text input and deleted a character belonging to prev token
                    setTokens(tokens.slice(0, -1))
                    resetAutocomplete()
                }
            } else if (c === ' ' || c === '/') {
                // when cursor at end of input without repo, eval if a repo can be resolved
                const maybeRepo = value
                    .substring(0, value.length - 1)
                    .split('/')
                if (maybeRepo.length === 2) {
                    startRepo(
                        { owner: maybeRepo[0], name: maybeRepo[1] },
                        value.substring(0, value.length - 1),
                        value.substring(value.length - 1),
                    )
                }
            }
        } else if (tokens?.length) {
            // cursor within input text, pop tokens after cursor and reparse
            const retained = tokens.filter(t => t.end < e.target.selectionEnd)
            if (retained.length > 2) {
                // did not fuck with first two tokens `repo, separator`
                setTokens(retained)
            } else {
                // full reset and eval for repo on typing
                reset()
            }
        }
    }

    function startRepo(
        repo: RepositoryId,
        repoText: string,
        separatorText: string,
    ) {
        if (repoState?.loading instanceof AbortController) {
            repoState.loading.abort()
        }
        const loading = new AbortController()
        reset()
        setRepoState({
            mode: 'typing',
            loading,
            repo,
        })
        setTokens([
            {
                kind: 'repo',
                start: 0,
                end: repoText.length,
                value: repoText,
                width: getTextWidthPx(sizingRef.current!, repoText),
            },
            {
                kind: 'seperator',
                start: repoText.length,
                end: repoText.length + separatorText.length,
                value: separatorText,
                width: getTextWidthPx(sizingRef.current!, separatorText),
            },
        ])
        const { signal } = loading
        console.log('resolving start url', repo.owner, repo.name)
        queryRepoObject(ghToken, repo, '', { signal })
            .then(result => {
                const exists = result !== 'repo-not-found'
                setRepoState({
                    mode: 'typing',
                    exists,
                    loading: false,
                    repo,
                })
                if (exists) {
                    resolveTree(repo, '', result)
                }
            })
            .catch(e => {
                if (!isAbort(e)) {
                    throw e
                }
            })
    }

    function resolveTokenFromTyping() {
        const input = inputRef.current!
        const untokenizedStart = tokens!.at(-1)!.end
        const separatorStart = input.value.length - 1
        const separator = input.value.charAt(separatorStart)
        if (untokenizedStart === separatorStart) {
            // resolving only separator and no path
            setTokens([
                ...tokens!,
                {
                    kind: 'seperator',
                    start: separatorStart,
                    end: input.value.length,
                    value: separator,
                    width: getTextWidthPx(sizingRef.current!, separator),
                },
            ])
        } else {
            // resolving path and separator
            const path = input.value.substring(untokenizedStart, separatorStart)
            resolveIfTree(repoState!.repo, buildPathFromTokens(tokens, path))
            setTokens([
                ...tokens!,
                {
                    kind: 'path',
                    start: untokenizedStart,
                    end: separatorStart,
                    value: path,
                    width: getTextWidthPx(sizingRef.current!, path),
                },
                {
                    kind: 'seperator',
                    start: separatorStart,
                    end: input.value.length,
                    value: separator,
                    width: getTextWidthPx(sizingRef.current!, separator),
                },
            ])
            resetAutocomplete()
        }
    }

    function resolveIfTree(repo: RepositoryId, path: string) {
        const object = objectStateRef.current[path]
        if (isResolved(object) && object.resolved.kind === 'tree') {
            resolveTree(repo, path, object.resolved)
        }
    }

    function resolveTree(repo: RepositoryId, root: string, object: RepoObject) {
        debugPrint('resolveTree', { root, object })
        if (object.kind === 'blob') throw Error('must not be blob')
        collectResolved(objectStateRef.current, root, object)
        object.entries
            .filter(o => o.kind === 'tree')
            .map(o => o.name)
            .forEach(dir => {
                const loading = new AbortController()
                const { signal } = loading
                const dirpath = join(root, dir)
                objectStateRef.current[dirpath] = { loading }
                queryRepoObject(ghToken, repo, dirpath, { signal }).then(
                    result => onQueryObjectResult(dirpath, result),
                )
            })
    }

    function onQueryObjectResult(
        root: string,
        result: RepoObject | 'repo-not-found',
    ) {
        if (result === 'repo-not-found') {
            throw Error('darn diggity doo hickey what the f')
        } else {
            collectResolved(objectStateRef.current, root, result)
            updateAutocompletePaths()
        }
    }

    function updateAutocompletePaths() {
        if (repoState && repoState.mode === 'typing') {
            const inProgress = inputRef
                .current!.value.substring(tokens.at(-1)!.end)
                .toLowerCase()
            if (inProgress.length) {
                const object =
                    objectStateRef.current[buildPathFromTokens(tokens)]
                if (isResolved(object) && object.resolved.kind === 'tree') {
                    const availablePaths = object.resolved.entries.filter(p =>
                        p.name.toLowerCase().startsWith(inProgress),
                    )
                    setAutocompletePaths(availablePaths.map(o => o.name))
                    if (availablePaths.length === 1) {
                        setAutocompleteFocus(0)
                    }
                } else {
                    debugPrint('wtf happened to lib.rs in src?')
                }
            } else {
                resetAutocomplete()
            }
        }
    }

    function onKeyDown(e: KeyboardEvent) {
        if (!!autocompletePaths?.length) {
            let update: number | null = null
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault()
                    if (autocompleteFocus === null) {
                        update = 0
                    } else if (
                        autocompleteFocus + 1 <
                        autocompletePaths.length
                    ) {
                        update = autocompleteFocus + 1
                    }
                    break
                case 'ArrowUp':
                    e.preventDefault()
                    if (autocompleteFocus === null) {
                        update = autocompletePaths.length - 1
                    } else if (autocompleteFocus > 0) {
                        update = autocompleteFocus - 1
                    }
                    break
                case 'Enter':
                    e.preventDefault()
                    if (
                        autocompleteFocus !== null &&
                        autocompletePaths?.length
                    ) {
                        resolveTokenFromAutocomplete(
                            autocompletePaths[autocompleteFocus]!,
                        )
                    } else {
                        // try resolve from autocomplete menu suggestions without a nav or exclusive focus
                        resolveTokenFromSubmit()
                    }
                    break
            }
            if (update !== null) {
                setAutocompleteFocus(update)
            }
        }
    }

    function resolveTokenFromSubmit() {
        const { value } = inputRef.current!
        const start = tokens!.at(-1)!.end
        const maybeToken = value.substring(start)
        const path = buildPathFromTokens(tokens!, maybeToken)
        const object = objectStateRef.current[path]
        if (isResolved(object)) {
            setTokens([
                ...tokens!,
                {
                    start,
                    end: value.length,
                    value: maybeToken,
                    kind: 'path',
                    width: getTextWidthPx(sizingRef.current!, maybeToken),
                },
            ])
            resetAutocomplete()
            if (object.resolved.kind === 'blob') {
                onSearchLocation({
                    object: object.resolved,
                    repo: repoState!.repo,
                    path,
                })
            } else if (object.resolved.kind === 'tree') {
                resolveTree(repoState!.repo, path, object.resolved)
            }
        }
    }

    function resolveTokenFromAutocomplete(next: string) {
        const input = inputRef.current!
        input.value = `${input.value.substring(0, tokens!.at(-1)!.end)}${next}`
        const start = tokens!.at(-1)!.end
        const end = start + next.length
        const appendingTokens: Array<InputToken> = [
            {
                kind: 'path',
                start,
                end,
                value: next,
                width: getTextWidthPx(sizingRef.current!, next),
            },
        ]
        const path = buildPathFromTokens(tokens!, next)
        const object = objectStateRef.current[path]
        debugPrint('resolveFromAutocomplete', {
            autocompleting: { path, object, next },
        })
        if (!isResolved(object)) {
            throw Error(
                'you 10 rabbit fingered monster! you out typed the interface!',
            )
        } else if (object.resolved.kind === 'tree') {
            console.log('WTF', object.resolved)
            resolveTree(repoState!.repo, path, object.resolved)
            input.value += '/'
            appendingTokens.push({
                kind: 'seperator',
                start: end,
                end: end + 1,
                value: '/',
                width: getTextWidthPx(sizingRef.current!, '/'),
            })
        } else if (object.resolved.kind === 'blob') {
            onSearchLocation({
                object: object.resolved,
                repo: repoState!.repo,
                path,
            })
        }
        setTokens([...tokens!, ...appendingTokens])
        resetAutocomplete()
    }

    function onAutocompleteClick(e: MouseEvent) {
        resolveTokenFromAutocomplete((e.target as HTMLElement).dataset.name!)
    }

    function onPaste(e: any) {
        if (
            e.target.selectionStart === 0 &&
            e.target.selectionEnd === e.target.value.length
        ) {
            const pasting = e.clipboardData.getData('text/plain')
            if (
                pasting.startsWith('https://github.com/') ||
                pasting.startsWith('github.com/')
            ) {
                e.preventDefault()
                const ghUrl = expectGitHubUrl(pasting)
                if (ghUrl === 'error') {
                    console.log('not a gh url')
                } else {
                    console.log('pasting', pasting)
                    const abortController = new AbortController()
                    setRepoState({
                        mode: 'pasting',
                        repo: ghUrl.repo,
                        path: ghUrl.path,
                        loading: abortController,
                    })
                    console.log(
                        'resolving paste',
                        ghUrl.repo.owner,
                        ghUrl.repo.name,
                        ghUrl.path,
                    )
                    queryRepoObject(ghToken, ghUrl.repo, ghUrl.path, {
                        signal: abortController.signal,
                    })
                        .then(result => {
                            console.log('result', result)
                            if (result === 'repo-not-found') {
                                setRepoState({
                                    mode: 'pasting',
                                    repo: ghUrl.repo,
                                    path: ghUrl.path,
                                    exists: false,
                                    loading: false,
                                })
                            } else {
                                setRepoState({
                                    mode: 'pasting',
                                    repo: ghUrl.repo,
                                    path: ghUrl.path,
                                    exists: true,
                                    loading: false,
                                })
                                onSearchLocation({
                                    repo: ghUrl.repo,
                                    path: ghUrl.path,
                                    object: result,
                                })
                            }
                        })
                        .catch(e => {
                            if (!isAbort(e)) {
                                console.error(e)
                                setRepoState({
                                    mode: 'pasting',
                                    repo: ghUrl.repo,
                                    path: ghUrl.path,
                                    loading: 'error',
                                })
                            }
                        })
                }
                e.target.value = pasting
            }
        }
    }

    const showAutocomplete = inputFocus && !!autocompletePaths?.length
    const progressIndicators = createProgressIndicators(tokens, repoState)

    return (
        <div id="watch-search">
            <h3 className="header">Search for files to watch</h3>
            <div ref={sizingRef} id="watch-search-ui">
                <input
                    id="search-input"
                    ref={inputRef}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    onInput={onInput}
                    onPaste={onPaste}
                    onBlur={(e: FocusEvent) => {
                        if (autocompleteHover) {
                            e.preventDefault()
                        } else {
                            setInputFocus(false)
                        }
                    }}
                    onFocus={() => setInputFocus(true)}
                    onKeyDown={onKeyDown}
                ></input>
                <div id="autocomplete-shadow">
                    {inputRef.current !== null && (
                        <span style={{ opacity: '0' }}>
                            {inputRef.current.value}
                        </span>
                    )}
                    {showAutocomplete && autocompleteFocus !== null && (
                        <span>
                            {autocompletePaths[autocompleteFocus]!.substring(
                                inputRef.current!.value.length -
                                    tokens!.at(-1)!.end,
                            )}
                        </span>
                    )}
                </div>
                {progressIndicators}
                {showAutocomplete && (
                    <div
                        id="search-suggestions"
                        role="menu"
                        onMouseEnter={() => setAutocompleteHover(true)}
                        onMouseLeave={() => setAutocompleteHover(false)}
                        style={{
                            '--left': `${tokens!.map(t => t.width).reduce((t, v) => t + v)}px`,
                        }}
                    >
                        {autocompletePaths.map((p, i) => (
                            <div
                                key={p}
                                className={
                                    i === autocompleteFocus
                                        ? 'suggestion cursor'
                                        : 'suggestion'
                                }
                                role="menuitem"
                                data-name={p}
                                onClick={onAutocompleteClick}
                            >
                                {p}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function buildPathFromTokens(tokens: Array<InputToken>, next?: string): string {
    const p = tokens
        .filter(t => t.kind === 'path')
        .map(t => t.value)
        .join('/')
    return next?.length ? (p === '' ? next : `${p}/${next}`) : p
}

function getTextWidthPx(parent: HTMLElement, s: string) {
    const sizing = document.createElement('span')
    sizing.innerText = s
    sizing.classList.add('sizing')
    parent.appendChild(sizing)
    const w = sizing.getBoundingClientRect().width
    sizing.remove()
    return w
}

function createProgressIndicators(
    tokens: Array<InputToken> | null,
    repoState: ResolvingRepo | null,
): Array<ReactElement> | false {
    const repoLoading =
        tokens?.length && repoState?.loading instanceof AbortController
    const repoDoesNotExist = tokens?.length && repoState?.exists === false
    if (repoLoading || repoDoesNotExist) {
        const result: Array<ReactElement> = []
        if (repoLoading) {
            result.push(
                <div
                    key="repo-loading"
                    className="indicator repo loading"
                    style={{
                        '--width': `${tokens[0]!.width}px`,
                    }}
                ></div>,
            )
        }
        if (repoDoesNotExist) {
            result.push(
                <div
                    key="repo-err"
                    className="indicator repo error"
                    style={{
                        '--width': `${tokens[0]!.width}px`,
                    }}
                ></div>,
            )
        }
        return result
    } else {
        return false
    }
}

function expectGitHubUrl(
    url: string,
): { repo: RepositoryId; path: string } | 'error' {
    const pathParts = url
        .replace(/^https:\/\//, '')
        .replace(/^github\.com\//, '')
        .split('/')
    if (pathParts.length > 3) {
        switch (pathParts[2]) {
            case 'blob':
            case 'tree':
                const repo = { owner: pathParts[0]!, name: pathParts[1]! }
                const path = (
                    pathParts.at(-1) === ''
                        ? pathParts.slice(4, pathParts.length - 1)
                        : pathParts.slice(4)
                ).join('/')
                return { repo, path }
        }
    }
    return 'error'
}
