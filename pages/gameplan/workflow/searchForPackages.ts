import {
    collectRepoActivityData,
    searchCode,
    type RepoActivityData,
} from '@sidelines/github'
import {
    type Language,
    languageOfConfigFile,
    type Repository,
} from '@sidelines/model'

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
): ReturnType<Awaited<typeof searchCode>> {
    return await searchCode(ghToken, {
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
        const language = languageOfConfigFile(foundPackageConfig.filename)
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
    const repos: Array<Partial<Repository> & RepoActivityData> =
        await collectRepoActivityData(ghToken)
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
