import type { FindPackagesDataProvider } from './findPackagesApi.ts'

export class TestDataProvider implements FindPackagesDataProvider {
    readonly #contents: Record<string, string>
    readonly #tags: Record<string, string>

    constructor(
        contents: Record<string, string>,
        tags: Record<string, string>,
    ) {
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

    async tag(tagPrefix: string = ''): Promise<string | null> {
        return Promise.resolve(this.#tags[tagPrefix] || null)
    }
}
