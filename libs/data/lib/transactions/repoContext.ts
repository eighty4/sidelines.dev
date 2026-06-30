import {
    queryViewerRepoUserContext,
    type ViewerRepoUserContext,
} from '@sidelines/github/repository/queryViewerRepoUserContext'
import {
    joinRepoName,
    type RepoNameWithOwner,
    type RepositoryId,
} from '@sidelines/model'
import { isFetchFailed, Unavailable } from '@sidelines/model/errors'
import { ghLoginToSession } from '../caches/ghLogin.ts'
import {
    DB_STORE_REPO_CONTEXT,
    idbGetRecord,
    idbPutRecord,
} from '../database.ts'
import { connectToDb } from '../indexeddb.ts'
import type { RepoContextRecord } from '../records.ts'

// todo candidate for `@sidelines/model`?
export type { ViewerRepoUserContext } from '@sidelines/github/repository/queryViewerRepoUserContext'

const LOG_LABEL = '@sidelines/data/tx/repoContext'

// todo RefNotFound from readRepoHead could openCursor and attempt to find most recent computed packages data
export async function resolveRepoUserContext(
    ghToken: string,
    repo: RepositoryId,
): Promise<ViewerRepoUserContext | typeof Unavailable> {
    const queryingFromApi = queryViewerRepoUserContext(ghToken, repo)
    const connectingToDb = connectToDb()
    let fromApi: ViewerRepoUserContext | null = null
    try {
        fromApi = await queryingFromApi
        console.log(LOG_LABEL, 'from graphql', fromApi)
    } catch (e) {
        if (!isFetchFailed(e)) {
            const db = await connectingToDb
            db.close()
            throw e
        } else {
            console.log(LOG_LABEL, 'fetch failed')
        }
    }
    const nameWithOwner: RepoNameWithOwner = joinRepoName(repo)
    const db = await connectingToDb
    try {
        if (fromApi) {
            await idbPutRecord<RepoContextRecord>(db, DB_STORE_REPO_CONTEXT, {
                nameWithOwner,
                userContext: fromApi,
            })
            ghLoginToSession(fromApi.login)
            return fromApi
        } else {
            const fromCache = await idbGetRecord<RepoContextRecord>(
                db,
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
    } finally {
        db.close()
    }
}
