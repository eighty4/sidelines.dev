import { JobKinds, type JobKind } from './jobs.ts'
import type { RepoNameWithOwner, RepositoryId } from './repo.ts'

type MessageObject = { kind: string } & UnspecifiedObject

type UnspecifiedObject = {
    [key: string]: unknown
}

function isUnspecifiedObject(v: unknown): v is UnspecifiedObject {
    return v !== null && typeof v === 'object'
}

function isUndefined(v: unknown): v is undefined {
    return typeof v === 'undefined'
}

export function isString(v: unknown): v is string {
    return typeof v === 'string'
}

function isNumber(v: unknown): v is number {
    return typeof v === 'number'
}

export function isMessageObject(v: unknown): v is MessageObject {
    return isUnspecifiedObject(v) && 'kind' in v
}

export function isOptionalNumber(v: unknown): v is number | undefined {
    return isUndefined(v) || isNumber(v)
}

export function isNullOrString(v: unknown): v is string | null {
    return v === null || isString(v)
}

export function isOptionalRepoId(v: unknown): v is RepositoryId | undefined {
    return isUndefined(v) || isRepoId(v)
}

export function isJobKind(v: unknown): v is JobKind {
    return (
        typeof v === 'string' &&
        (JobKinds as Readonly<Array<string>>).includes(v)
    )
}

export function isRepoId(v: unknown): v is RepositoryId {
    return isUnspecifiedObject(v) && isString(v.owner) && isString(v.name)
}

export function isRepoName(v: unknown): v is RepoNameWithOwner {
    return isString(v) && v.includes('/')
}

export function isArray<T>(a: unknown, p: (v: T) => boolean): a is Array<T> {
    return Array.isArray(a) && a.every(p)
}
