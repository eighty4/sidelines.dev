import {
    connectToDb,
    DB_STORE_REPO_FILES,
    DB_STORE_REPO_NAV,
    DB_STORE_REPO_PACKAGES,
    DB_STORE_SYNCING,
} from '@sidelines/data/debug'
import {
    type ChangeEvent,
    type CSSProperties,
    type FC,
    useEffect,
    useState,
} from 'react'
import { createRoot } from 'react-dom/client'
import {
    getDbStoreMetadata,
    queryDbStore,
    queryDbStoreIndex,
    type StoreMetadata,
} from './db.ts'
import {
    type FileEntry,
    lookupFileEntriesFromRoot,
    lookupFileFromRoot,
} from './fs.ts'
import {
    DatabaseSvg,
    DownloadSvg,
    FileSvg,
    FolderSvg,
    KeySvg,
    SortAscSvg,
    SortDescSvg,
} from './Svgs.tsx'
import { onDomInteractive } from '../../init.ts'

const DB_STORES = [
    DB_STORE_REPO_NAV,
    DB_STORE_REPO_PACKAGES,
    DB_STORE_REPO_FILES,
    DB_STORE_SYNCING,
]

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

const DataPage: FC = () => {
    const [db, setDb] = useState<IDBDatabase | 'connecting'>('connecting')
    const [view, setView] = useState<ViewState | null>(null)

    useEffect(() => {
        connectToDb().then(setDb).catch(console.error)
    }, [])

    let main
    if (view?.kind === 'db' && db !== 'connecting') {
        main = <StoreView db={db} storeName={view.table} />
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
                {DB_STORES.map(store => {
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

const StoreView: FC<{ db: IDBDatabase; storeName: string }> = ({
    db,
    storeName,
}) => {
    const [store, setStore] = useState<StoreMetadata | 'loading'>('loading')
    const [indexed, setIndexed] = useState<string | false | null>(null)
    const [direction, setDirection] = useState<IDBCursorDirection>('next')
    const [objects, setObjects] = useState<
        Array<Record<string, any>> | 'loading'
    >('loading')

    useEffect(() => {
        if (store !== 'loading') setStore('loading')
        if (indexed) setIndexed(null)
        if (direction === 'prev') setDirection('next')
        else if (direction === 'prevunique') setDirection('nextunique')
        getDbStoreMetadata(db, storeName).then(setStore).catch(console.error)
    }, [storeName])

    useEffect(() => {
        if (objects !== 'loading') setObjects('loading')
        if (indexed) {
            queryDbStoreIndex(db, storeName, indexed, direction).then(
                setObjects,
            )
        } else {
            queryDbStore(db, storeName, direction).then(setObjects)
        }
    }, [store, indexed, direction])

    if (!db || store === 'loading') {
        return
    }

    const { keys, fields, indexKeys, indexNames } = store

    function onIndexToggle() {
        if (!indexed) {
            setIndexed(indexNames.sort()[0])
        } else {
            setIndexed(false)
        }
    }

    function onIndexChange(e: ChangeEvent<HTMLSelectElement>) {
        setIndexed(e.target.value || false)
    }

    function onDirectionToggle() {
        if (direction.endsWith('unique')) {
            setDirection(
                direction === 'nextunique' ? 'prevunique' : 'nextunique',
            )
        } else {
            setDirection(direction === 'next' ? 'prev' : 'next')
        }
    }

    function onUniqueToggle() {
        if (direction.endsWith('unique')) {
            setDirection(direction === 'nextunique' ? 'next' : 'prev')
        } else {
            setDirection(direction === 'next' ? 'nextunique' : 'prevunique')
        }
    }

    // whether cursor direction has unique toggled
    const viewCursorUnique = direction.endsWith('unique')

    // assign keys of view whether keys of store or index
    const viewIndexing = indexed ? indexKeys[indexed] : keys

    // append index keys after object store keys
    const viewKeys = [...keys]
    if (indexed) {
        for (const indexKey of indexKeys[indexed]) {
            viewKeys.push(indexKey)
        }
    }

    // filter out index keys from fields
    const viewFields = indexed
        ? fields.filter(field => !indexKeys[indexed].includes(field))
        : fields

    return (
        <>
            <h1>
                Object store `<span className="selectable">{storeName}</span>`
            </h1>
            {!!indexNames.length && (
                <div id="index-select">
                    <input
                        type="checkbox"
                        id="index-toggle"
                        onChange={onIndexToggle}
                        checked={!!indexed}
                    />
                    <label htmlFor="index-toggle">View by index</label>
                    {indexed !== null && (
                        <select onChange={onIndexChange} value={indexed || ''}>
                            <option></option>
                            {indexNames.map(indexName => {
                                return (
                                    <option key={indexName}>{indexName}</option>
                                )
                            }) || false}
                        </select>
                    )}
                </div>
            )}
            <div id="cursor-direction">
                <p>
                    Cursor direction is `
                    <span className="selectable">{direction}</span>`
                </p>
                <p>
                    <input
                        type="checkbox"
                        id="unique-toggle"
                        onChange={onUniqueToggle}
                        checked={viewCursorUnique}
                    />{' '}
                    <label htmlFor="unique-toggle">Unique cursor</label>
                </p>
            </div>
            <table id="db-table">
                <thead>
                    <tr>
                        {viewKeys.map(key =>
                            viewIndexing.includes(key) ? (
                                <th
                                    key={key}
                                    className="key index"
                                    onClick={onDirectionToggle}
                                >
                                    <KeySvg /> {key}{' '}
                                    {direction.startsWith('next') ? (
                                        <SortAscSvg className="direction" />
                                    ) : (
                                        <SortDescSvg className="direction" />
                                    )}
                                </th>
                            ) : (
                                <th
                                    key={key}
                                    className="key"
                                    onClick={onIndexToggle}
                                >
                                    <KeySvg /> {key}{' '}
                                    <SortAscSvg className="direction" />
                                </th>
                            ),
                        )}
                        {viewFields.map(field => (
                            <th key={field}>{field}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {objects !== 'loading' &&
                        objects.map((object, i) => {
                            return (
                                <tr key={i}>
                                    {viewKeys.map(key => (
                                        <td key={key}>
                                            {toStringForTable(object[key])}
                                        </td>
                                    ))}
                                    {viewFields.map(field => (
                                        <td key={field}>
                                            {toStringForTable(object[field])}
                                        </td>
                                    ))}
                                </tr>
                            )
                        })}
                </tbody>
            </table>
        </>
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

onDomInteractive(async () => {
    createRoot(document.getElementById('root')!).render(<DataPage />)
})
