export class NotFoundError extends Error {
    constructor(resource?: string) {
        super(resource ? `not found: ${resource}` : 'not found')
        this.name = this.constructor.name
    }
}

export function onUnauthorized() {
    location.assign('/logout')
}

export type Pageable<T> = {
    data: Array<T>
    pageInfo: {
        endCursor: string
        hasNextPage: boolean
    }
    totalCount: number
}
