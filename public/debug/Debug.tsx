import { type CSSProperties, type FC, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DatabaseSvg, DownloadSvg, FileSvg, FolderSvg, KeySvg } from './Svgs.ts'
import {
    connectToDb,
    DB_STORE_FILES,
    DB_STORE_NAV,
} from '@sidelines/data/debug'
import {
    type FileEntry,
    lookupFileEntriesFromRoot,
    lookupFileFromRoot,
} from './fs.ts'
import { getDbStoreData, type StoreData } from './db.ts'

type ViewState =
    | {
          kind: 'db'
          table: string
          index?: string
      }
    | {
          kind: 'fs'
          path: string
      }

const DebugPage: FC = () => {
    const [db, setDb] = useState<IDBDatabase | 'connecting'>('connecting')
    const [view, setView] = useState<ViewState | null>(null)

    useEffect(() => {
        connectToDb().then(setDb).catch(console.error)
    }, [])

    let main
    if (view?.kind === 'db') {
        main = (
            <StoreView
                db={db === 'connecting' ? null : db}
                store={view.table}
            />
        )
    } else if (view?.kind === 'fs') {
        main = <FileView path={view.path} />
    }

    function onOpenTable(table: string) {
        setView({ kind: 'db', table })
    }

    function onOpenFile(path: string) {
        setView({ kind: 'fs', path })
    }

    const openStore = view?.kind === 'db' ? view.table : null
    const openFilePath = view?.kind === 'fs' ? view.path : null

    return (
        <>
            <nav id="debug-index">
                <div className="header">
                    <DatabaseSvg /> IndexedDB
                </div>
                {[DB_STORE_NAV, DB_STORE_FILES].map(store => {
                    const classes =
                        openStore === store ? 'db-store open' : 'db-store'
                    return (
                        <div
                            key={store}
                            className={classes}
                            onClick={() => onOpenTable(store)}
                        >
                            {store}
                        </div>
                    )
                })}
                <div className="header">
                    <DownloadSvg /> OPFS
                </div>
                <FileIndex
                    onOpenFile={onOpenFile}
                    openFilePath={openFilePath}
                />
            </nav>
            <main id="debug-view">{main}</main>
        </>
    )
}

const FileIndex: FC<{
    onOpenFile: (p: string) => void
    openFilePath: string | null
}> = ({ onOpenFile, openFilePath }) => {
    const [files, setFiles] = useState<Array<FileEntry> | 'loading'>('loading')

    useEffect(() => {
        lookupFileEntriesFromRoot().then(setFiles).catch(console.error)
    }, [])

    if (files === 'loading') {
        return <div className="files"></div>
    }

    if (!files.length) {
        return <div className="no-files">empty</div>
    }

    return (
        <div className="files">
            {files.map(f => (
                <FileIndexEntry
                    key={f.name}
                    f={f}
                    indent={0}
                    onOpenFile={onOpenFile}
                    openFilePath={openFilePath}
                />
            ))}
        </div>
    )
}

const FileIndexEntry: FC<{
    f: FileEntry
    indent: number
    onOpenFile: (p: string) => void
    openFilePath: string | null
}> = ({ f, indent, onOpenFile, openFilePath }) => {
    const indentCSS = { '--indent': indent } as CSSProperties
    if (f.type === 'file') {
        let classes = 'ls-entry file'
        if (f.path === openFilePath) classes += ' open'
        return (
            <div
                className={classes}
                style={indentCSS}
                onClick={() => onOpenFile(f.path)}
            >
                <FileSvg />
                {f.name}
            </div>
        )
    } else {
        const next = indent + 1
        return (
            <>
                <div className="ls-entry dir" style={indentCSS}>
                    <FolderSvg />
                    {f.name}
                </div>
                {f.ls.map(f => (
                    <FileIndexEntry
                        key={f.name}
                        f={f}
                        indent={next}
                        onOpenFile={onOpenFile}
                        openFilePath={openFilePath}
                    />
                ))}
            </>
        )
    }
}

const FileView: FC<{ path: string }> = ({ path }) => {
    const [content, setContent] = useState<string | 'loading'>('loading')

    useEffect(() => {
        console.log(path)
        lookupFileFromRoot(path.substring(1).split('/'))
            .then(f => f.getFile())
            .then(f => f.text())
            .then(setContent)
            .catch(console.error)
    }, [path])

    if (content === 'loading') {
        return
    } else {
        return <pre>{content}</pre>
    }
}

const StoreView: FC<{ db: IDBDatabase | null; store: string }> = ({
    db,
    store,
}) => {
    const [data, setData] = useState<StoreData | 'loading'>('loading')

    useEffect(() => {
        if (data !== 'loading') {
            setData('loading')
        }
        if (db !== null) {
            getDbStoreData(db, store).then(setData).catch(console.error)
        }
    }, [db, store])

    if (db === null || data === 'loading') {
        return
    }

    const { keys, fields, objects } = data

    return (
        <table>
            <thead>
                <tr>
                    {keys.map(key => (
                        <th key={key}>
                            <KeySvg /> {key}
                        </th>
                    ))}
                    {fields.map(field => (
                        <th key={field}>{field}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {objects.map((object, i) => {
                    console.log(object)
                    return (
                        <tr key={i}>
                            {keys.map(key => (
                                <td key={key}>
                                    {toStringForTable(object[key])}
                                </td>
                            ))}
                            {fields.map(field => (
                                <td key={field}>
                                    {toStringForTable(object[field])}
                                </td>
                            ))}
                        </tr>
                    )
                })}
            </tbody>
        </table>
    )
}

function toStringForTable(datum: unknown): string {
    if (datum instanceof Date) {
        return datum.toLocaleString()
    } else if (typeof datum === 'object') {
        return JSON.stringify(datum)
    } else {
        return '' + datum
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    createRoot(document.getElementById('root')!).render(<DebugPage />)
})
