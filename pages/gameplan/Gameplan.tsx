import { UnauthorizedError } from '@sidelines/github'
import { type FC } from 'react'
import { createRoot } from 'react-dom/client'
import { expectGhLogin, expectGhToken } from '../init.ts'
import { logout } from '../nav.ts'

interface GameplanPageProps {
    ghToken: string
    ghLogin: string
}

const Gameplan: FC<GameplanPageProps> = () => {
    return <p></p>
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const ghToken = expectGhToken()
        const ghLogin = await expectGhLogin(ghToken)
        createRoot(document.getElementById('root')!).render(
            <Gameplan ghToken={ghToken} ghLogin={ghLogin} />,
        )
    } catch (e) {
        if (e instanceof UnauthorizedError) {
            logout()
            return
        } else {
            throw e
        }
    }
})
