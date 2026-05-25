import queryRepoObjectContent from '@sidelines/github/repository/objects/queryRepoObjectContent'
import queryRepoMultipleObjectsContents from '@sidelines/github/repository/objects/queryRepoMultipleObjectsContents'
import queryRepoRefsHighestSemverTag from '@sidelines/github/repository/refs/queryRepoRefsHighestSemverTag'
import type { BranchRef, RepositoryId } from '@sidelines/model'
import { RepoNotFound } from '@sidelines/model/errors'

export type FindPackagesDataProvider = {
    // return file contents by path from repo root
    contents(
        paths: string | Array<string>,
    ): Promise<Record<string, string | null>>
    tag(tagPrefix?: string): Promise<string | null>
}

export class FindPackagesApi {
    readonly #dataProvider: FindPackagesDataProvider
    readonly #repo: RepositoryId
    readonly #branchRef: BranchRef

    constructor(
        dataProvider: FindPackagesDataProvider,
        repo: RepositoryId,
        branchRef: BranchRef,
    ) {
        this.#dataProvider = dataProvider
        this.#repo = repo
        this.#branchRef = branchRef
    }

    get repo(): RepositoryId {
        return this.#repo
    }

    // abstract contents(
    //     paths: string | Array<string>,
    // ): Promise<Record<string, string | null>>

    // abstract getTag(tagPrefix?: string): Promise<string | null>

    // fallback to sha if tag-not-found
    async getTagOrSha(tagPrefix?: string): Promise<string> {
        return (
            (await this.#dataProvider.tag(tagPrefix)) ||
            this.#branchRef.headOid.substring(0, 7)
        )
    }

    // given subdir paths relative to a root path relative to a repository root,
    // return file contents of files named filename
    // result record keys will be the joined root and subdir paths
    async workspaceConfigs(
        root: string,
        paths: Array<string>,
        filename: string,
    ): Promise<Record<string, string | null>> {
        const contentPathPrefix = root.length ? root + '/' : ''
        const contentPaths = paths.map(
            p => `${contentPathPrefix}${p}/${filename}`,
        )
        const contents = await this.#dataProvider.contents(contentPaths)
        const result: Record<string, string | null> = {}
        for (let i = 0; i < paths.length; i++) {
            result[contentPathPrefix + paths[i]] = contents[contentPaths[i]]
        }
        return result
    }
}

export class DefaultFindPackagesDataProvider implements FindPackagesDataProvider {
    readonly #ghToken: string
    readonly #repo: RepositoryId
    readonly #tagCache: Record<string, Promise<string | null>> = {}

    constructor(ghToken: string, repo: RepositoryId) {
        this.#ghToken = ghToken
        this.#repo = repo
    }

    async contents(
        paths: string | Array<string>,
    ): Promise<Record<string, string | null>> {
        console.log('asdgasdgasdg')
        if (typeof paths === 'string') {
            return {
                [paths]: await queryRepoObjectContent(
                    this.#ghToken,
                    this.#repo,
                    paths,
                ),
            }
        } else {
            const result = await queryRepoMultipleObjectsContents(
                this.#ghToken,
                this.#repo,
                paths,
            )
            if (result === RepoNotFound) {
                throw new Error()
            }
            return result
        }
    }

    async tag(tagPrefix?: string): Promise<string | null> {
        const tagCacheKey = tagPrefix || ''
        if (typeof this.#tagCache[tagCacheKey] === 'undefined') {
            this.#tagCache[tagCacheKey] = queryRepoRefsHighestSemverTag(
                this.#ghToken,
                this.#repo,
                tagPrefix,
            )
        }
        try {
            return await this.#tagCache[tagCacheKey]
        } catch (e) {
            return null
        }
    }
}

export function topYamlList(
    k: `${string}:`,
    yaml: string,
): Array<string> | null {
    const lines = yaml
        .substring(1 + yaml.indexOf('\n', yaml.indexOf(k)))
        .split('\n')
    if (lines.length) {
        const firstLineWithContent = lines.find(l => l.trim().length > 0)
        if (!firstLineWithContent || !/^\s+- /.test(firstLineWithContent)) {
            return null
        }
        const indent = firstLineWithContent?.indexOf('-')
        if (!indent) {
            return null
        }
        const isListItem = new RegExp('^\\s{' + indent + '}-')
        const items: Array<string> = []
        for (const line of lines) {
            if (/^\s*$/.test(line)) {
                continue
            }
            if (!isListItem.test(line)) {
                break
            }
            items.push(line.substring(indent + 1).trim())
        }
        return items
    }
    return null
}
