import {
    type Language,
    type PackageConfig,
    type Repository,
} from '@sidelines/data/web'
import {
    listRepositoriesForActivityRelevance,
    search,
    type RepositoryRelevanceData,
} from '@sidelines/github'

const LANG_CFGS: Record<Language, PackageConfig> = {
    dart: 'pubspec.yaml',
    go: 'go.mod',
    js: 'package.json',
    rust: 'Cargo.toml',
    zig: 'build.zig',
}

const CFG_LANGS: Record<PackageConfig, Language> = (() => {
    const r: Record<string, Language> = {}
    for (const [language, configFile] of Object.entries(LANG_CFGS)) {
        r[configFile] = language as Language
    }
    return r
})()

type FoundLanguageRepos<T> = Array<{
    language: Language
    repos: Array<T>
}>

export type PackageSearchResult =
    | {
          state: 'prerelevance'
          data: FoundLanguageRepos<string>
      }
    | {
          state: 'orderable'
          data: FoundLanguageRepos<Repository>
      }

// todo support rate limiting reporting to client
export async function searchForPackages(
    ghToken: string,
    ghLogin: string,
    update: (result: PackageSearchResult) => void,
) {
    let repos: Record<string, Repository> | undefined
    let gettingRepos = getAllUserReposForOrderCriteria(ghToken, ghLogin).then(
        data => (repos = data),
    )
    const data = await getUserPackages(ghToken, ghLogin)
    if (repos) {
        update({
            state: 'orderable',
            data: mergeRepoOrderingData(data, repos),
        })
    } else {
        update({
            state: 'prerelevance',
            data,
        })
        await gettingRepos
        update({
            state: 'orderable',
            data: mergeRepoOrderingData(data, repos!),
        })
    }
}

async function searchForPackageConfigs(
    ghToken: string,
    ghLogin: string,
): ReturnType<Awaited<typeof search>> {
    return await search(ghToken, {
        kind: 'in:path',
        qualifiers: [
            { type: 'user', term: ghLogin },
            { type: 'path', term: '/' },
            { type: 'filename', term: 'pubspec.yaml' },
            { type: 'filename', term: 'go.mod' },
            { type: 'filename', term: 'package.json' },
            { type: 'filename', term: 'Cargo.toml' },
            { type: 'filename', term: 'build.zig' },
        ],
        term: '',
    })
}

async function getUserPackages(
    ghToken: string,
    ghLogin: string,
): Promise<FoundLanguageRepos<string>> {
    const occurrences: Partial<Record<Language, number>> = {}
    const results: Partial<Record<Language, Array<string>>> = {}
    for (const foundPackageConfig of await searchForPackageConfigs(
        ghToken,
        ghLogin,
    )) {
        const language = CFG_LANGS[foundPackageConfig.filename as PackageConfig]
        if (!results[language]) {
            results[language] = []
        }
        results[language].push(foundPackageConfig.repo)
        // determine priority order of languages based on # of repos of each language
        if (occurrences[language]) {
            occurrences[language] = occurrences[language] + 1
        } else {
            occurrences[language] = 1
        }
    }

    // determine order of languages by prominence
    const order: Array<Language> = Object.entries(occurrences)
        .map(([language, occurrences]) => ({ language, occurrences }))
        .sort((r1, r2) => {
            if (r1.occurrences < r2.occurrences) {
                return -1
            } else if (r1.occurrences > r2.occurrences) {
                return 1
            } else {
                return 0
            }
        })
        .map(result => result.language as Language)

    // map ordered languages to sorted repos by repo name
    return order.map(language => ({
        language,
        repos: results[language]!.sort(),
    }))
}

async function getAllUserReposForOrderCriteria(
    ghToken: string,
    ghLogin: string,
): Promise<Record<string, Repository>> {
    const repos: Array<Partial<Repository> & RepositoryRelevanceData> =
        await listRepositoriesForActivityRelevance(ghToken)
    const result: Record<string, Repository> = {}
    for (const repo of repos) {
        repo.owner = ghLogin
        result[repo.name] = repo as Repository
    }
    return result
}

function mergeRepoOrderingData(
    data: FoundLanguageRepos<string>,
    ordering: Record<string, Repository>,
): FoundLanguageRepos<Repository> {
    return data.map(({ language, repos }) => {
        return {
            language,
            repos: repos.map(repo => ordering[repo]),
        }
    })
}
