import { connectToDb } from '@sidelines/data/indexeddb'
import { readRecentNav, writeNavVisit } from '@sidelines/data/tx/repoNav'
import { readRepoPackages } from '@sidelines/data/tx/repoPackages'
import type { RepositoryId, RepositoryPackage } from '@sidelines/model'
import type { RefNotFound, RepoNotFound } from '@sidelines/model/errors'
import {
    isMessageObject,
    isNullOrString,
    isString,
    isRepoId,
    isOptionalNumber,
} from '@sidelines/model/validate'

declare const self: DedicatedWorkerGlobalScope

export type UserDataMessageBase<KIND> = {
    kind: KIND
} & {
    [key: string]: unknown
}

export type UserDataRpcMessageBase<KIND> = UserDataMessageBase<KIND> & {
    id: string
}

export type ProjectNavUpdateRequest = {
    repo: RepositoryId
} & UserDataMessageBase<'nav-update'>

export type ProjectNavGetRequest = {
    limit?: number
} & UserDataRpcMessageBase<'nav-get'>

export type ProjectNavGetResponse = {
    repos: Array<RepositoryId>
} & UserDataRpcMessageBase<ProjectNavGetRequest['kind']>

export type RepoPackagesRequest = {
    ghToken: string
    repo: RepositoryId
} & UserDataRpcMessageBase<'repo-pkgs'>

export type RepoPackagesResponse = {
    result: Array<RepositoryPackage> | typeof RefNotFound | typeof RepoNotFound
} & UserDataRpcMessageBase<RepoPackagesRequest['kind']>

export type UserDataRequest = UserDataRpcRequest | ProjectNavUpdateRequest

export type UserDataRpcRequest = ProjectNavGetRequest | RepoPackagesRequest

export type UserDataRpcResponse = ProjectNavGetResponse | RepoPackagesResponse

let connectingToDb = connectToDb()

async function processAsyncRequest(request: UserDataRequest): Promise<void> {
    switch (request.kind) {
        case 'nav-update':
            await writeNavVisit(await connectingToDb, request.repo)
            break
        default:
            throw Error(request.kind + ' is not an async user data request')
    }
}

async function processRpcRequest(
    request: UserDataRpcRequest,
): Promise<UserDataRpcResponse> {
    switch (request.kind) {
        case 'nav-get':
            return {
                kind: request.kind,
                id: request.id,
                repos: await readRecentNav(await connectingToDb, request),
            }
        case 'repo-pkgs':
            return {
                kind: request.kind,
                id: request.id,
                result: await readRepoPackages(
                    await connectingToDb,
                    request.ghToken,
                    request.repo,
                ),
            }
        default:
            throw Error(
                (request as any).kind + ' is not an rpc user data request',
            )
    }
}

function isRpcRequest(
    req: UserDataMessageBase<any>,
): req is UserDataRpcRequest {
    if (!isString(req.id)) {
        return false
    }
    switch (req.kind) {
        case 'nav-get':
            return isOptionalNumber(req.limit)
        case 'repo-cat':
            return (
                isString(req.ghToken) &&
                isRepoId(req.repo) &&
                isNullOrString(req.dirpath) &&
                isString(req.filename)
            )
        case 'repo-ls':
            return (
                isString(req.ghToken) &&
                isRepoId(req.repo) &&
                isNullOrString(req.dirpath)
            )
        case 'repo-pkgs':
            return isString(req.ghToken) && isRepoId(req.repo)
    }
    return false
}

self.onmessage = async (e: MessageEvent<UserDataRequest>) => {
    if (!isMessageObject(e.data)) {
        console.error('workers/userData.js onmessage bad input', e.data)
        self.close()
    } else {
        const req = e.data
        try {
            if (isRpcRequest(req)) {
                self.postMessage(await processRpcRequest(req))
            } else {
                await processAsyncRequest(req)
            }
        } catch (e) {
            console.error(
                'error processing',
                req.kind,
                'request:',
                req,
                'error:',
                e,
            )
        }
    }
}

self.onmessageerror = e => console.error('worker userData.js onmessageerror', e)
