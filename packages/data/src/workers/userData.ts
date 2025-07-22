import { readRecentNav, writeNavVisit } from '../database/navHistory.ts'
import type { RepositoryId } from '../model.ts'

export type UserDataMessageBase = {
    kind: string
}

export interface UserDataRpcMessageBase extends UserDataMessageBase {
    id: string
}

export type ProjectNavUpdateRequest = {
    kind: 'nav-update'
    repo: RepositoryId
} & UserDataMessageBase

export type ProjectNavGetRequest = {
    kind: 'nav-get'
    limit?: number
} & UserDataRpcMessageBase

export type ProjectNavGetResponse = {
    kind: ProjectNavGetRequest['kind']
    repos: Array<RepositoryId>
} & UserDataRpcMessageBase

export type UserDataRequest = UserDataRpcRequest | ProjectNavUpdateRequest

export type UserDataRpcRequest = ProjectNavGetRequest

export type UserDataRpcResponse = ProjectNavGetResponse

async function processAsyncRequest(request: UserDataRequest): Promise<void> {
    switch (request.kind) {
        case 'nav-update':
            await writeNavVisit(request.repo)
            break
        default:
            throw Error()
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
        default:
            throw Error()
    }
}

function isMessage(req: unknown): req is UserDataMessageBase {
    if (req === null || typeof req !== 'object') {
        return false
    }
    return 'kind' in req && typeof req.kind === 'string'
}

function isRpcRequest(req: UserDataMessageBase): req is UserDataRpcRequest {
    switch (req.kind) {
        case 'nav-get':
            return 'id' in req && typeof req.id === 'string'
    }
    return false
}

onmessage = async (e: MessageEvent<UserDataRequest>) => {
    if (!isMessage(e.data)) {
        console.error('workers/userData.js onmessage bad input', e.data)
    } else if (isRpcRequest(e.data)) {
        postMessage(await processRpcRequest(e.data))
    } else {
        await processAsyncRequest(e.data)
    }
}

onmessageerror = e => console.error('workers/userData.js onmessageerror', e)
