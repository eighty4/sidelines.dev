export type CreateRepositoryError = {
  name: 'repository-exists'
}

export async function createNotesRepo(ghToken: string) {
  try {
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + ghToken,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        name: '.sidelines',
        description: 'Note taking on Sidelines.dev',
        homepage: 'https://sidelines.dev',
        private: true,
        is_template: false,
        has_projects: false,
        has_issues: false,
        has_wiki: false,
        has_discussions: false,
      })
    })
    switch (response.status) {
      case 401:
        console.error(await response.text())
        break
      case 201:
        console.log('woooo')
        break
      default:
        console.error(await response.text())
        throw new Error('wtf')
    }
  } catch (e) {
    console.log(Object.keys(e))
  }
}

export async function doesNotesRepoExist(ghToken: string): Promise<boolean | 'misconfigured'> {
  const query = 'query { viewer { repository(name: ".sidelines") { homepageUrl nameWithOwner } } }'
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + ghToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  const json = await response.json()
  if (!json.data.viewer.repository) {
    return false
  } else if (json.data.viewer.repository.homepageUrl !== 'https://sidelines.dev') {
    return 'misconfigured'
  } else {
    return true
  }
}

export async function doesRepoExist(ghToken: string, repo: string): Promise<boolean> {
  const query = `query { viewer { repository(name: "${repo}") { nameWithOwner } } }`
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + ghToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  const json = await response.json()
  return !!json.data.viewer.repository
}
