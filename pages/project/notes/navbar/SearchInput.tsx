import { searchRepoNames, type SearchRepoNamesResult } from '@sidelines/github'
import type { RepositoryId } from '@sidelines/model'
import { useEffect, useMemo, useRef, useState, type FC } from 'react'
import { navToProject } from '../../../nav.ts'

interface SearchInputProps {
    currentPageProject: RepositoryId
    ghToken: string
    ghLogin: string
}

// todo keyboard access for search suggestions
export const SearchInput: FC<SearchInputProps> = ({
    currentPageProject,
    ghToken,
    ghLogin,
}) => {
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
        searchRepoNames(ghToken, ghLogin, searchTerm).then(result => {
            result.matches = result.matches.filter(
                repoName => repoName !== currentPageProject.name,
            )
            searchResults[result.term] = result
            if (searchTerm === result.term) {
                updateState(result)
            }
        })
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
                    navToProject({
                        owner: ghLogin,
                        name: searchSuggestions.matches[highlightCursor],
                    })
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
                                onClick={() =>
                                    navToProject({
                                        owner: ghLogin,
                                        name: match,
                                    })
                                }
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
