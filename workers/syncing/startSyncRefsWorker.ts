import { SyncRefsClient } from './SyncRefsClient.ts'

export default function startSyncRefsWorker(ghToken: string) {
    new SyncRefsClient(ghToken)
}
