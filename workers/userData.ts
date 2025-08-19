import {
    readRecentNav,
    writeNavVisit,
    readRepoPackages,
    type ReadRepoContent,
    readRepoContent,
    type ReadRepoListing,
    readRepoListing,
} from '@sidelines/data/web'
import type {
    RepositoryId,
    RepositoryObject,
    RepositoryPackage,
} from '@sidelines/model'

declare const self: DedicatedWorkerGlobalScope

export type UserDataMessageBase<KIND> = {
    kind: KIND
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

export type RepoListingRequest = ReadRepoListing &
    UserDataRpcMessageBase<'repo-ls'>

export type RepoListingResponse = {
    objects: 'repo-not-found' | Array<RepositoryObject>
} & UserDataRpcMessageBase<RepoListingRequest['kind']>

export type RepoObjectRequest = ReadRepoContent &
    UserDataRpcMessageBase<'repo-cat'>

export type RepoObjectResponse = {
    content: 'file-not-found' | 'repo-not-found' | string
} & UserDataRpcMessageBase<RepoObjectRequest['kind']>

export type RepoPackagesRequest = {
    ghToken: string
    repo: RepositoryId
} & UserDataRpcMessageBase<'repo-pkgs'>

export type RepoPackagesResponse = {
    result: 'repo-not-found' | Array<RepositoryPackage>
} & UserDataRpcMessageBase<RepoPackagesRequest['kind']>

export type UserDataRequest = UserDataRpcRequest | ProjectNavUpdateRequest

export type UserDataRpcRequest =
    | ProjectNavGetRequest
    | RepoListingRequest
    | RepoObjectRequest
    | RepoPackagesRequest

export type UserDataRpcResponse =
    | ProjectNavGetResponse
    | RepoListingResponse
    | RepoObjectResponse
    | RepoPackagesResponse

async function processAsyncRequest(request: UserDataRequest): Promise<void> {
    switch (request.kind) {
        case 'nav-update':
            await writeNavVisit(request.repo)
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
                repos: await readRecentNav(request),
            }
        case 'repo-cat':
            return {
                kind: request.kind,
                id: request.id,
                content: await readRepoContent(request),
            }
        case 'repo-ls':
            return {
                kind: request.kind,
                id: request.id,
                objects: await readRepoListing(request),
            }
        case 'repo-pkgs':
            return {
                kind: request.kind,
                id: request.id,
                result: await readRepoPackages(request.ghToken, request.repo),
            }
        default:
            throw Error(
                (request as any).kind + ' is not an rpc user data request',
            )
    }
}

function isMessage(req: unknown): req is UserDataMessageBase<any> {
    if (req === null || typeof req !== 'object') {
        return false
    }
    return 'kind' in req && typeof req.kind === 'string'
}

function isRpcRequest(
    req: UserDataMessageBase<any>,
): req is UserDataRpcRequest {
    switch (req.kind) {
        case 'nav-get':
        case 'repo-cat':
        case 'repo-ls':
        case 'repo-pkgs':
            return 'id' in req && typeof req.id === 'string'
    }
    return false
}

self.onmessage = async (e: MessageEvent<UserDataRequest>) => {
    if (!isMessage(e.data)) {
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
            console.error('error processing', req.kind, 'request:', e)
        }
    }
}

self.onmessageerror = e => console.error('worker userData.js onmessageerror', e)
