import type { Language, Repository } from '@sidelines/model'
import { type FC, useEffect, useMemo, useState } from 'react'
import type { CallToAction, WorkflowRepoSearch } from './WorkflowRepoSearch.ts'

export interface ChooseCallToActionProps {
    workflowSearch: WorkflowRepoSearch
}

export const ChooseCallToAction: FC<ChooseCallToActionProps> = ({
    workflowSearch,
}) => {
    const [languages, setLanguages] = useState<null | Array<Language>>(null)
    const [repos, setRepos] = useState<null | Partial<
        Record<Language, Array<Repository>>
    >>(null)
    const [callToActions, setCallToActions] = useState<null | Record<
        string,
        Array<CallToAction>
    >>(null)

    useEffect(() => {
        const sub = workflowSearch.events.subscribe(e => {
            if (e.kind === 'repos') {
                setLanguages(e.languages)
                setRepos(e.repos)
            } else if (e.kind === 'callToAction') {
                if (callToActions === null) {
                    setCallToActions({ [e.repo]: e.callToActions })
                } else if (callToActions[e.repo]) {
                    setCallToActions({
                        ...callToActions,
                        [e.repo]: [
                            ...callToActions[e.repo],
                            ...e.callToActions,
                        ],
                    })
                } else {
                    setCallToActions({
                        ...callToActions,
                        [e.repo]: e.callToActions,
                    })
                }
            }
        })
        return () => sub.unsubscribe()
    }, [])

    if (languages === null || repos === null || callToActions === null) {
        return
    }

    return (
        <>
            {languages
                .filter(language => {
                    return repos[language]?.some(
                        repo => !!callToActions[repo.name],
                    )
                })
                .map(language => {
                    return (
                        <ReposOfALanguage
                            callToActions={callToActions}
                            language={language}
                            repos={repos[language]!.filter(
                                repo => callToActions[repo.name],
                            )}
                        />
                    )
                })}
        </>
    )
}

type ReposOfALanguageProps = {
    callToActions: Record<string, Array<CallToAction>>
    language: Language
    repos: Array<Repository>
}

const toLanguageDisplay = (s: Language) =>
    s === 'js' ? 'JS' : s.charAt(0).toUpperCase() + s.substring(1)

type RepoOrdering = 'name' | 'stargazerCount' | 'updatedAt'

const ReposOfALanguage: FC<ReposOfALanguageProps> = ({
    callToActions,
    language,
    repos,
}) => {
    const languageDisplay = useMemo(
        () => toLanguageDisplay(language),
        [language],
    )

    const [ordered, setOrdered] = useState(repos)
    const [ordering, setOrdering] = useState<RepoOrdering>('name')

    function updateOrder() {
        let next: RepoOrdering
        switch (ordering) {
            case 'name':
                next = 'stargazerCount'
                break
            case 'stargazerCount':
                next = 'updatedAt'
                break
            case 'updatedAt':
                next = 'name'
                break
        }
        setOrdered(
            [...ordered].sort((r1, r2) => {
                if (r1[next] < r2[next]) {
                    return -1
                }
                if (r1[next] > r2[next]) {
                    return -1
                }
                return 0
            }),
        )
        setOrdering(next)
    }

    return (
        <div>
            <h3>{languageDisplay}</h3>
            <button onClick={updateOrder}>Click me!</button>
            <>
                {ordered.map(repo => (
                    <div>
                        <h4>{repo.name}</h4>
                        <div>
                            {callToActions[repo.name]!.map(callToAction => {
                                if (callToAction.kind === 'cicd') {
                                }
                                return 'asdf'
                            }).join(', ')}
                        </div>
                    </div>
                ))}
            </>
        </div>
    )
}
