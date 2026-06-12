import { Component, type ErrorInfo, type ReactNode } from 'react'

export type ErrorFallbackProps = {
    callback?: (e: Error) => void
    children: ReactNode
    fallback: ReactNode
}

type ErrorFallbackState = {
    caughtError: boolean
}

export default class ErrorFallback extends Component<
    ErrorFallbackProps,
    ErrorFallbackState
> {
    static getDerivedStateFromError(): ErrorFallbackState {
        return { caughtError: true }
    }

    constructor(props: ErrorFallbackProps) {
        super(props)
        this.state = { caughtError: false }
    }

    render() {
        return this.state.caughtError
            ? this.props.fallback
            : this.props.children
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(
            'ErrorFallback caught',
            error,
            'with component stack:',
            info.componentStack,
        )
        if (this.props.callback) {
            this.props.callback(error)
        }
    }
}
