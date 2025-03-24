import {
    searchRepoNames,
    type SearchRepoNamesResult,
} from '@eighty4/sidelines-github'
import { useEffect, useMemo, useRef, useState, type FC } from 'react'
import { ghLoginCache } from '../../storage.ts'

interface SearchInputProps {
    ghToken: string
    repo: string
}

// todo keyboard access for search suggestions
export const SearchInput: FC<SearchInputProps> = ({ ghToken, repo }) => {
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [focused, setFocused] = useState(false)
    const [closeOnBlur, setCloseOnBlur] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const searchResults: Record<string, SearchRepoNamesResult> = useMemo(
        () => ({}),
        [],
    )
    const [searchSuggestions, setSearchSuggestions] =
        useState<SearchRepoNamesResult | null>(null)
    const [highlightCursor, setHighlightCursor] = useState<number>(0)

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.code === 'KeyK' && e.metaKey) {
                searchInputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [])

    useEffect(() => {
        if (!searchTerm.length) {
            resetState()
            return
        } else if (searchResults[searchTerm]) {
            updateState(searchResults[searchTerm])
        } else if (
            searchSuggestions?.term?.length &&
            !searchTerm.startsWith(searchSuggestions.term)
        ) {
            resetState()
        }
        searchRepoNames(ghToken, ghLoginCache.expect(), searchTerm).then(
            result => {
                result.matches = result.matches.filter(match => match !== repo)
                searchResults[result.term] = result
                if (searchTerm === result.term) {
                    updateState(result)
                }
            },
        )
    }, [searchTerm])

    useEffect(() => {
        if (focused) {
            updateState(searchResults[searchTerm] || null)
        } else if (closeOnBlur) {
            resetState()
        }
    }, [focused])

    function resetState() {
        updateState(null)
    }

    function updateState(result: SearchRepoNamesResult | null) {
        setSearchSuggestions(result)
        setHighlightCursor(0)
    }

    function onInputKeyUp(e: React.KeyboardEvent<HTMLInputElement>) {
        switch (e.key) {
            case 'ArrowUp':
                moveHighlightCursorUp()
                break
            case 'ArrowDown':
                moveHighlightCursorDown()
                break
            case 'Escape':
                searchInputRef.current!.blur()
                break
            case 'Enter':
                if (highlightCursor !== null && searchSuggestions !== null) {
                    navToProject(searchSuggestions.matches[highlightCursor])
                }
                break
        }
    }

    function moveHighlightCursorUp() {
        if (highlightCursor !== null && highlightCursor > 1) {
            setHighlightCursor(highlightCursor - 1)
        } else {
            setHighlightCursor(0)
        }
    }

    function moveHighlightCursorDown() {
        if (highlightCursor !== null) {
            setHighlightCursor(highlightCursor + 1)
        } else {
            setHighlightCursor(0)
        }
    }

    function navToProject(project: string) {
        location.assign(`/project?name=${project}`)
    }

    return (
        <div id="project-nav-search">
            <input
                type="search"
                ref={searchInputRef}
                placeholder={focused ? 'Search repos' : 'Cmd + K'}
                onBlur={() => setFocused(false)}
                onFocus={() => setFocused(true)}
                onKeyUp={e => onInputKeyUp(e)}
                onChange={e => setSearchTerm(e.target.value)}
            />
            {!!searchSuggestions?.matches.length && (
                <div
                    id="project-nav-suggestions"
                    onMouseEnter={() => setCloseOnBlur(false)}
                    onMouseLeave={() => setCloseOnBlur(true)}
                >
                    {searchSuggestions.matches.map((match, i) => {
                        return (
                            <div
                                className={`suggestion ${i === highlightCursor ? 'highlight' : ''}`}
                                key={match}
                                onClick={() => navToProject(match)}
                            >
                                {match}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
