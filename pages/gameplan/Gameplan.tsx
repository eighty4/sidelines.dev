import { UnauthorizedError } from '@sidelines/github'
import { expectGhLogin, expectGhToken } from '@sidelines/pageload/session'
import { onDomInteractive } from '@sidelines/pageload/ready'
import { type FC } from 'react'
import { createRoot } from 'react-dom/client'
import { logout } from '../nav.ts'

interface GameplanPageProps {
    ghToken: string
    ghLogin: string
}

const Gameplan: FC<GameplanPageProps> = () => {
    return (
        <div id="view">
            <div id="reading-cta" onClick={() => location.assign('/watches')}>
                Go to Watches
            </div>
        </div>
    )
}

onDomInteractive(async () => {
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
