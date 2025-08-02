import { createSidelinesRepo } from '@sidelines/github'
import type { RepositoryId } from '@sidelines/model'
import { type FC, useState } from 'react'
import { ConfigureError } from './ConfigureError.tsx'

export interface MakeNotesRepoProps {
    ghToken: string
    ghLogin: string
    // optionally provide name of project repo to init sidelines repo with
    repo?: RepositoryId
    onRepoMade: () => void
}

export const MakeNotesRepo: FC<MakeNotesRepoProps> = ({
    ghToken,
    ghLogin,
    repo,
    onRepoMade,
}) => {
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState(false)

    async function createRepository() {
        setCreating(true)
        try {
            await createSidelinesRepo(ghToken, ghLogin, repo?.name)
            onRepoMade()
        } catch (e) {
            console.error(e)
            setError(true)
        }
    }

    if (error) {
        return (
            <ConfigureError msg="An unexpected error occured creating the .sidelines repo under your GitHub account." />
        )
    }

    return (
        <div>
            <p>
                Sidelines.dev uses a private repo in your GitHub account for
                note-taking.
            </p>
            <p>
                This repo's name is .sidelines and does not exist in your
                account.
            </p>
            <div>
                <button disabled={creating} onClick={createRepository}>
                    Create .sidelines repository
                </button>
            </div>
        </div>
    )
}
