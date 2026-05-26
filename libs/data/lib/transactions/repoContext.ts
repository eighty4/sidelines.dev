import type { RepositoryId } from '@sidelines/model'
import {
    queryViewerRepoUserContext,
    type ViewerRepoUserContext,
} from '@sidelines/github/repository/queryViewerRepoUserContext'
import {
    DB_STORE_REPO_CONTEXT,
    idbGetRecord,
    idbPutRecord,
} from '../database.ts'
import { isFetchFailed, Unavailable } from '@sidelines/model/errors'
import { ghLoginToSession } from '../caches/ghLogin.ts'

// todo candidate for `@sidelines/model`?
export type { ViewerRepoUserContext } from '@sidelines/github/repository/queryViewerRepoUserContext'

// DB_STORE_REPO_CONTEXT
type RepoContextRecord = {
    nameWithOwner: string
    userContext: ViewerRepoUserContext
}

const LOG_LABEL = '@sidelines/data/tx/repoContext'

// todo RefNotFound from readRepoHead could openCursor and attempt to find most recent computed packages data
export async function resolveRepoUserContext(
    ghToken: string,
    repo: RepositoryId,
): Promise<ViewerRepoUserContext | typeof Unavailable> {
    const nameWithOwner = `${repo.owner}/${repo.name}`
    let fromApi: ViewerRepoUserContext | null = null
    try {
        fromApi = await queryViewerRepoUserContext(ghToken, repo)
        console.log(LOG_LABEL, 'from graphql', fromApi)
    } catch (e) {
        if (!isFetchFailed(e)) {
            throw e
        } else {
            console.log(LOG_LABEL, 'fetch failed')
        }
    }
    if (fromApi) {
        await idbPutRecord<RepoContextRecord>(DB_STORE_REPO_CONTEXT, {
            nameWithOwner,
            userContext: fromApi,
        })
        ghLoginToSession(fromApi.login)
        return fromApi
    } else {
        const fromCache = await idbGetRecord<RepoContextRecord>(
            DB_STORE_REPO_CONTEXT,
            nameWithOwner,
        )
        console.log(LOG_LABEL, 'from indexeddb', fromCache)
        if (fromCache) {
            ghLoginToSession(fromCache.userContext.login)
            return fromCache.userContext
        } else {
            return Unavailable
        }
    }
}
