import { doesRepoExist, getUserLogin } from '@eighty4/sidelines-github'
import { type FC, useEffect, useState } from 'react'
import { ConfigureError } from './ConfigureError.tsx'

export interface ChooseProjectProps {
  ghToken: string
  onProjectChoice: (repo: string) => void
}

type ChooseProjectError = 'server' | 'not-a-repo'

export const ChooseProject: FC<ChooseProjectProps> = ({ ghToken, onProjectChoice }) => {
  const [repo, setRepo] = useState('')
  const [username, setUsername] = useState<string | undefined>()
  const [clicked, setClicked] = useState(false)
  const [error, setError] = useState<ChooseProjectError | undefined>()

  useEffect(() => {
    getUserLogin(ghToken).then(setUsername).catch(e => {
      console.error(e)
      setError('server')
    })
  }, [])

  if (error === 'server') {
    return <ConfigureError msg={`An unexpected error occured verifying if the repo ${repo} exists.`} />
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRepo(e.target.value)
    if (error) {
      setError(undefined)
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      onButtonClick()
    }
  }

  async function onButtonClick() {
    try {
      if (await doesRepoExist(ghToken, repo)) {
        onProjectChoice(repo)
      } else {
        setClicked(false)
        setError('not-a-repo')
      }
    } catch (e) {
      console.error(e)
      setError('server')
    }
  }

  return <div>
    <p>Choose a project to get started.</p>
    <p>This repo must be owned by your GitHub account.</p>
    {username && <p>
      {username} / <input disabled={clicked} value={repo}
        onChange={onInputChange}
        onKeyDown={onInputKeyDown} />
      {error === 'not-a-repo' && <p style={{ color: 'orangered' }}>That ain't no repo, foo!</p>}
    </p>}
    <div>
      <button disabled={clicked || !repo.length} onClick={onButtonClick}>Let's fucking rock!</button>
    </div>
  </div>
}
