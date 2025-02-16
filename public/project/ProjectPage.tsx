import { createRoot } from 'react-dom/client'

const ProjectPage = () => {
  const repo = new URL(location.href).searchParams.get('name')
  return <p>{repo}</p>
}

document.addEventListener('DOMContentLoaded', () => {
  createRoot(document.getElementById('root')!).render(<ProjectPage />)
})
