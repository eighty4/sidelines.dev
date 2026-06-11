import { markdown } from '@codemirror/lang-markdown'
import { EditorView, basicSetup } from 'codemirror'
import { type FC, useEffect, useState } from 'react'
import type { MarkdownEditorProps } from '../MarkdownEditor.api.tsx'

const CodeMirrorMarkdownEditor: FC<MarkdownEditorProps> = ({ content }) => {
    const [parent, setParent] = useState<HTMLDivElement>()

    useEffect(() => {
        if (!parent) return
        const editor = new EditorView({
            extensions: [basicSetup, markdown()],
            parent,
            doc: content,
        })
        return () => {
            editor.destroy()
        }
    }, [parent])

    return <div ref={setParent as (node: HTMLDivElement) => void}></div>
}

export default CodeMirrorMarkdownEditor
