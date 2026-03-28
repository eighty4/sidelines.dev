export class NotFoundError extends Error {
    type = 'NOT_FOUND'
    constructor(resource?: string) {
        super(resource ? `not found: ${resource}` : 'not found')
        this.name = this.constructor.name
    }
}

export function onUnauthorized() {
    location.assign('/logout')
}

export class UnauthorizedError extends Error {
    type = 'UNAUTHORIZED'
    constructor(msg: string) {
        super(msg)
        this.name = this.constructor.name
    }
}
