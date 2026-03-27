import type { RepositoryObject } from '@sidelines/model'

export type GraphqlResponse<DATA> = {
    data: DATA
    errors: Array<{
        type: string
        path: Array<string>
        locations: Array<{ line: number; column: number }>
        message: string
    }>
}

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

// sorts dirs on filename a-z, then files on filename a-z
export function sortRepositoryObjects(
    rc1: RepositoryObject,
    rc2: RepositoryObject,
): -1 | 0 | 1 {
    if (rc1.type === rc2.type) {
        const rc1n = rc1.name.toUpperCase()
        const rc2n = rc2.name.toUpperCase()
        if (rc1n === rc2n) {
            return 0
        } else if (rc1n < rc2n) {
            return -1
        } else {
            return 1
        }
    }
    return rc1.type === 'dir' ? -1 : 1
}
