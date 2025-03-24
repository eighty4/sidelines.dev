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
