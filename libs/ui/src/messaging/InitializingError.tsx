import type { FC } from 'react'

export const InitializingError: FC<{ msg: string }> = ({ msg }) => {
    return (
        <div>
            <p>{msg}</p>
            <p>
                I don't know what the fuck happened! Let's try again from the
                top.
            </p>
            <p>
                <a href="/configure">/configure</a>
            </p>
        </div>
    )
}
