import monacoPackageJson from 'monaco-editor/package.json' with { type: 'json' }
import { isProductionBuild } from './flags.ts'

export const monacoVersion = monacoPackageJson.version

export type SidelinesGlobal = {
    env: {
        MONACO_VERSION: string
    }
    IS_DEV: boolean
    IS_PROD: boolean
    worker: {
        SYNC_REFS: string
        USER_DATA: string
        GH_ACTIONS: string
    }
}

type DefineSidelinesGlobalKey =
    | `sidelines.env.${keyof SidelinesGlobal['env']}`
    | 'sidelines.IS_DEV'
    | 'sidelines.IS_PROD'
    | `sidelines.worker.${keyof SidelinesGlobal['worker']}`

export type DefineSidelinesGlobal = Record<DefineSidelinesGlobalKey, string>

const GH_ACTIONS = '/lib/sidelines/workers/ghActions.js'
const SYNC_REFS = '/lib/sidelines/workers/syncRefs.js'
const USER_DATA = '/lib/sidelines/workers/userData.js'

function create(workerUrls: Record<string, string>): DefineSidelinesGlobal {
    const isProduction = isProductionBuild()
    return {
        'sidelines.env.MONACO_VERSION': JSON.stringify(monacoVersion),
        'sidelines.IS_DEV': JSON.stringify(!isProduction),
        'sidelines.IS_PROD': JSON.stringify(isProduction),
        'sidelines.worker.GH_ACTIONS': JSON.stringify(workerUrls.GH_ACTIONS),
        'sidelines.worker.SYNC_REFS': JSON.stringify(workerUrls.SYNC_REFS),
        'sidelines.worker.USER_DATA': JSON.stringify(workerUrls.USER_DATA),
    }
}

export function defineSidelinesForEsbuildWatch(): DefineSidelinesGlobal {
    return create({
        GH_ACTIONS,
        SYNC_REFS,
        USER_DATA,
    })
}

export function defineSidelinesFromWorkerUrls(
    workerUrls: Record<string, string>,
): DefineSidelinesGlobal {
    return create({
        GH_ACTIONS: workerUrls[GH_ACTIONS],
        SYNC_REFS: workerUrls[SYNC_REFS],
        USER_DATA: workerUrls[USER_DATA],
    })
}
