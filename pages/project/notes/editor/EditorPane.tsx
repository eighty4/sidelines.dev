import { MonacoEditor } from '@sidelines/ui/monaco'
import { editor as Editor, Uri } from 'monaco-editor'
import { type FC, useEffect, useState } from 'react'
import type { RepoFile } from '../RepoSources.ts'

interface EditorPaneProps {
    openFile: RepoFile
}

export const EditorPane: FC<EditorPaneProps> = ({ openFile }) => {
    const [editor, setEditor] = useState<Editor.IStandaloneCodeEditor | null>(
        null,
    )

    useEffect(() => {
        if (editor) {
            setOpenFileModel(editor)
        }
    }, [editor, openFile])

    function setOpenFileModel(editor: Editor.IStandaloneCodeEditor) {
        if (openFile.type === 'file-cat') {
            const modelUri = createEditorModelURI(openFile)
            const existing = Editor.getModels().find(
                m => m.uri.toString() === modelUri.toString(),
            )
            if (existing) {
                editor.setModel(existing)
            } else {
                const language = languageFromFilename(openFile.name)
                const value = openFile.content
                editor.setModel(Editor.createModel(value, language, modelUri))
            }
        } else {
            editor.setModel(null)
        }
    }

    return <MonacoEditor id="editor-pane" onLoad={setEditor} />
}

// todo refactor RepoFile to a class instead of interface
function createEditorModelURI(openFile: RepoFile): Uri {
    return Uri.file(`/${openFile.repo}/${openFile.dirpath}/${openFile.name}`)
}

// todo refactor RepoFile to a class instead of interface
function languageFromFilename(filename: string): string | undefined {
    const extension = filename.substring(filename.lastIndexOf('.') + 1)
    switch (extension) {
        case 'js':
            return 'javascript'
        case 'ts':
            return 'typescript'
        case 'md':
            return 'markdown'
    }
}
