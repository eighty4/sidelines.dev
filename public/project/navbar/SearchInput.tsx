import { searchRepoNames, type SearchRepoNamesResult } from '@eighty4/sidelines-github'
import { useEffect, useMemo, useRef, useState, type FC } from 'react'
import { ghLoginCache, } from '../../storage.ts'

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
  const searchResults: Record<string, SearchRepoNamesResult> = useMemo(() => ({}), [])
  const [searchSuggestions, setSearchSuggestions] = useState<SearchRepoNamesResult | null>(null)

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
      setSearchSuggestions(null)
      return
    } else if (searchResults[searchTerm]) {
      setSearchSuggestions(searchResults[searchTerm])
    } else if (searchSuggestions?.term?.length && !searchTerm.startsWith(searchSuggestions.term)) {
      setSearchSuggestions(null)
    }
    searchRepoNames(ghToken, ghLoginCache.expect(), searchTerm).then(result => {
      result.matches = result.matches.filter(match => match !== repo)
      searchResults[result.term] = result
      if (searchTerm === result.term) {
        setSearchSuggestions(result)
      }
    })
  }, [searchTerm])

  useEffect(() => {
    if (focused) {
      setSearchSuggestions(searchResults[searchTerm] || null)
    } else if (closeOnBlur) {
      setSearchSuggestions(null)
    }
  }, [focused])

  return <div id="project-nav-search">
    <input type="search"
      ref={searchInputRef}
      placeholder={focused ? 'Search repos' : 'Cmd + K'}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onChange={e => setSearchTerm(e.target.value)} />
    {!!searchSuggestions?.matches.length && <div id="project-nav-suggestions"
      onMouseEnter={() => setCloseOnBlur(false)}
      onMouseLeave={() => setCloseOnBlur(true)}>
      {searchSuggestions.matches.map(match => {
        return <div className="suggestion" key={match} onClick={() => location.assign(`/project?name=${match}`)}>{match}</div>
      })}
    </div>
    }
  </div>
}
