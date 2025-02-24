import { onUnauthorized } from './responses.ts'

export async function getUserLogin(ghToken: string): Promise<string | 'unauthorized'> {
  const query = 'query { viewer { login } }'
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + ghToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  if (response.status === 401) {
    onUnauthorized()
  }
  const json = await response.json()
  return json.data.viewer.login
}
