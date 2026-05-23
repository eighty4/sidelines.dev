import type { RepositoryObject } from '@sidelines/model'

// sorts dirs on filename a-z, then files on filename a-z
export function sortRepoObjects(
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
