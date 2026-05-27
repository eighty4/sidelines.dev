import {
    captureOwnerStack,
    Component,
    type ErrorInfo,
    type ReactNode,
} from 'react'

export type ErrorFallbackProps = {
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
        console.error(error, info.componentStack, captureOwnerStack())
    }
}
