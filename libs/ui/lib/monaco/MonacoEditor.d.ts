import { editor as Editor } from 'monaco-editor'
import { type FC, type HTMLAttributes } from 'react'
export type MonacoEditorProps = {
    onLoad: (editor: Editor.IStandaloneCodeEditor) => void
    options?: Editor.IStandaloneEditorConstructionOptions
} & Pick<HTMLAttributes<any>, 'className' | 'id' | 'style'>
export declare const MonacoEditor: FC<MonacoEditorProps>
