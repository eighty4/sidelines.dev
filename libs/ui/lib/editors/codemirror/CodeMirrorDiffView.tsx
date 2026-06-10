import { MergeView } from '@codemirror/merge'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { type FC, useEffect, useState } from 'react'
import type { DiffViewProps } from '../DiffView.api.tsx'

const DiffView: FC<DiffViewProps> = ({ modified, original }) => {
    const [parent, setParent] = useState<HTMLDivElement>()

    useEffect(() => {
        if (!parent) return
        const mergeView = new MergeView({
            highlightChanges: true,
            gutter: true,
            collapseUnchanged: {
                margin: 3,
                minSize: 4,
            },
            a: {
                doc: original,
                extensions: [
                    basicSetup,
                    EditorView.editable.of(false),
                    EditorState.readOnly.of(true),
                ],
            },
            b: {
                doc: modified,
                extensions: [
                    basicSetup,
                    EditorView.editable.of(false),
                    EditorState.readOnly.of(true),
                ],
            },
            parent,
        })
        return () => {
            mergeView.destroy()
        }
    }, [parent])

    return <div ref={setParent as (node: HTMLDivElement) => void}></div>
}

export default DiffView
