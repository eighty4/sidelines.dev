import { MergeView } from '@codemirror/merge'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { type FC, useEffect, useState } from 'react'

export type DiffViewProps = {
    before: string
    after: string
    readonly?: boolean
}

export const DiffView: FC<DiffViewProps> = ({before, after, readonly}) => {
    const [parent, setParent] = useState<HTMLDivElement | undefined>()

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
                doc: before,
                extensions: readonly ? [
                    basicSetup,
                    EditorView.editable.of(false),
                    EditorState.readOnly.of(true),
                ] : basicSetup,
            },
            b: {
                doc: after,
                extensions: [
                    basicSetup,
                    EditorView.editable.of(false),
                    EditorState.readOnly.of(true),
                ],
            },
            parent: document.body,
        })
        return () => {
            mergeView.destroy()
        }
    }, [parent])

    return <div ref={setParent as (node: HTMLDivElement | null) => void}></div>
}
