export async function getUserLogin(ghToken: string): Promise<string> {
  const query = 'query { viewer { login } }'
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + ghToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  const json = await response.json()
  return json.data.viewer.login
}

export async function isTokenValid(ghToken: string): Promise<boolean> {
  const query = 'query { viewer { login } }'
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + ghToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  return response.status !== 401
}
