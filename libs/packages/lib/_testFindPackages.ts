import type { BranchRef, RepositoryId } from '@sidelines/model'
import { FindPackagesApi } from './findPackagesApi.ts'

export class TestFindPackagesApi extends FindPackagesApi {
    readonly #contents: Record<string, string>
    readonly #tags: Record<string, string>

    constructor(
        repo: RepositoryId,
        branchRef: BranchRef,
        contents: Record<string, string>,
        tags: Record<string, string>,
    ) {
        super(repo, branchRef)
        this.#contents = contents
        this.#tags = tags
    }

    async contents(
        paths: string | Array<string>,
    ): Promise<Record<string, string | null>> {
        const result: Record<string, string | null> = {}
        for (const path of Array.isArray(paths) ? paths : [paths]) {
            result[path] = this.#contents[path] || null
        }
        return Promise.resolve(result)
    }

    getTag(tagPrefix: string = ''): Promise<string | null> {
        return Promise.resolve(this.#tags[tagPrefix] || null)
    }
}
