import { type FC } from 'react'
import { createRoot } from 'react-dom/client'
import { onDomInteractive } from '../../init.ts'

const ComponentsPage: FC = () => {
    return <div>Web stuff</div>
}

onDomInteractive(async () => {
    createRoot(document.getElementById('root')!).render(<ComponentsPage />)
})
