import { type FC, useState } from 'react'
import { createNotesRepo } from '@eighty4/sidelines-github'
import { ConfigureError } from './ConfigureError.tsx'
import { ghLoginCache } from '../storage.ts'

export interface MakeNotesRepoProps {
  ghToken: string
  onRepoMade: () => void
}

export const MakeNotesRepo: FC<MakeNotesRepoProps> = ({ ghToken, onRepoMade }) => {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(false)

  async function createRepository() {
    setCreating(true)
    try {
      await createNotesRepo(ghToken, ghLoginCache.read()!)
      onRepoMade()
    } catch (e) {
      console.error(e)
      setError(true)
    }
  }

  if (error) {
    return <ConfigureError msg="An unexpected error occured creating the .sidelines repo under your GitHub account." />
  }

  return <div>
    <p>Sidelines.dev uses a private repo in your GitHub account for note-taking.</p>
    <p>This repo's name is .sidelines and does not exist in your account.</p>
    <div>
      <button disabled={creating} onClick={createRepository}>Create .sidelines repository</button>
    </div>
  </div>
}
