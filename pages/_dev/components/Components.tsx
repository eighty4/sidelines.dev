import { onDomInteractive } from '@sidelines/pageload'
import { type FC } from 'react'
import { createRoot } from 'react-dom/client'

const ComponentsPage: FC = () => {
    return <div>Web stuff</div>
}

onDomInteractive(async () => {
    createRoot(document.getElementById('root')!).render(<ComponentsPage />)
})
