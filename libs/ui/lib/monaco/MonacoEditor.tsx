import { editor as Editor } from 'monaco-editor'
import { useEffect, useRef, type FC, type HTMLAttributes } from 'react'
import { MonacoEnvironment } from './MonacoEnvironment.ts'

window.MonacoEnvironment = MonacoEnvironment

export type MonacoEditorProps = {
    onLoad: (editor: Editor.IStandaloneCodeEditor) => void
    options?: Editor.IStandaloneEditorConstructionOptions
} & Pick<HTMLAttributes<any>, 'className' | 'id' | 'style'>

const DEFAULT_OPTS: Editor.IStandaloneEditorConstructionOptions = {
    automaticLayout: true,
    minimap: {
        enabled: false,
    },
    model: null,
    theme: 'vs-dark',
}

function editorOpts(
    provided: MonacoEditorProps['options'],
): Editor.IStandaloneEditorConstructionOptions {
    if (!provided) {
        return DEFAULT_OPTS
    } else {
        return {
            ...DEFAULT_OPTS,
            ...provided,
        }
    }
}

export const MonacoEditor: FC<MonacoEditorProps> = ({
    className,
    id,
    onLoad,
    options,
    style,
}) => {
    const editorElemRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<Editor.IStandaloneCodeEditor>(null)

    useEffect(() => () => editorRef.current?.dispose(), [])

    useEffect(() => {
        if (editorElemRef.current !== null && editorRef.current === null) {
            onLoad(
                (editorRef.current = Editor.create(
                    editorElemRef.current,
                    editorOpts(options),
                )),
            )
        }
    }, [editorElemRef.current])

    return (
        <div
            className={className}
            id={id}
            style={style}
            ref={editorElemRef}
        ></div>
    )
}
