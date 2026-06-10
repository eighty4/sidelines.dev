import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import 'monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.css'
import { type FC, useEffect, useMemo, useRef, useState } from 'react'
import type { DiffViewProps } from '../DiffView.api.tsx'
import { MonacoEnvironment } from './MonacoEnvironment.ts'
import styles from './monaco.module.css'

globalThis.MonacoEnvironment = MonacoEnvironment

const MonacoDiffView: FC<DiffViewProps> = ({ modified, original }) => {
    const [parent, setParent] = useState<HTMLDivElement>()
    const editorRef = useRef<monaco.editor.IStandaloneDiffEditor>(null)
    const originalModel = useMemo(
        () => monaco.editor.createModel(original),
        [original],
    )
    const modifiedModel = useMemo(
        () => monaco.editor.createModel(modified),
        [modified],
    )

    useEffect(() => {
        if (!parent) return
        editorRef.current = monaco.editor.createDiffEditor(parent, {
            renderSideBySide: true,
            minimap: {
                enabled: false,
            },
            useInlineViewWhenSpaceIsLimited: false,
            readOnly: true,
        })
        editorRef.current.setModel({
            original: originalModel,
            modified: modifiedModel,
        })

        return () => {
            editorRef.current?.dispose()
        }
    }, [parent])

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.setModel({
                original: originalModel,
                modified: modifiedModel,
            })
        }
    }, [original, modified])

    return (
        <div
            className={styles.wrapper}
            ref={setParent as (node: HTMLDivElement) => void}
        ></div>
    )
}

export default MonacoDiffView
