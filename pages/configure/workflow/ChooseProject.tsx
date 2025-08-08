import type { UserDataClient } from '@sidelines/data/web'
import { doesRepoExist } from '@sidelines/github'
import type { RepositoryId } from '@sidelines/model'
import {
    type ChangeEvent,
    type FC,
    type KeyboardEvent,
    useEffect,
    useState,
} from 'react'
import { ConfigureError } from '../ConfigureError.tsx'
import { navToProject } from '../../nav.ts'

export interface ChooseProjectProps {
    userData: UserDataClient
}

type ChooseProjectError = 'server' | 'not-a-repo'

export const ChooseProject: FC<ChooseProjectProps> = ({ userData }) => {
    const [recentRepos, setRecentRepos] = useState<
        'loading' | Array<RepositoryId>
    >('loading')
    const [repo, setRepo] = useState('')
    const [clicked, setClicked] = useState(false)
    const [error, setError] = useState<ChooseProjectError | undefined>()

    useEffect(() => {
        userData.navHistory(3).then(setRecentRepos)
    }, [])

    if (error === 'server') {
        return (
            <ConfigureError
                msg={`An unexpected error occurred verifying if the repo ${repo} exists.`}
            />
        )
    }

    function onInputChange(e: ChangeEvent<HTMLInputElement>) {
        setRepo(e.target.value)
        if (error) {
            setError(undefined)
        }
    }

    async function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            await onButtonClick()
        }
    }

    async function onButtonClick(): Promise<void> {
        try {
            if (await doesRepoExist(userData.ghToken, repo)) {
                navToProject({ owner: userData.ghLogin, name: repo })
            } else {
                setClicked(false)
                setError('not-a-repo')
            }
        } catch (e) {
            console.error(e)
            setError('server')
        }
    }

    return (
        <div>
            <h3>Choose a project</h3>
            <p>
                This repo must be directly owned by your GitHub account.
                Organizations are not supported.
            </p>
            <h4>Repository name</h4>
            {userData.ghLogin && (
                <p>
                    {userData.ghLogin} /{' '}
                    <input
                        disabled={clicked}
                        value={repo}
                        onChange={onInputChange}
                        onKeyDown={onInputKeyDown}
                    />
                    {error === 'not-a-repo' && (
                        <p style={{ color: 'orangered' }}>
                            That ain't no repo, foo!
                        </p>
                    )}
                </p>
            )}
            <div>
                <button
                    disabled={clicked || !repo.length}
                    onClick={onButtonClick}
                >
                    Let's fucking rock!
                </button>
            </div>
            {recentRepos !== 'loading' && !!recentRepos?.length && (
                <div>
                    <h3>Return to recent projects</h3>
                    {recentRepos.map(repo => (
                        <div key={repo.name}>
                            <a
                                href={`/project?owner=${repo.owner}&name=${repo.name}`}
                            >
                                {repo.owner}/{repo.name}
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
