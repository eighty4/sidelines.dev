import { editor as Editor, Uri } from 'monaco-editor'
import { useEffect, useRef, type FC } from 'react'
import type { RepoFile } from '../RepoSources.ts'
import './initMonaco.ts'

interface EditorPaneProps {
    openFile: RepoFile
}

export const EditorPane: FC<EditorPaneProps> = ({ openFile }) => {
    const editorElemRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<Editor.IStandaloneCodeEditor>(null)

    useEffect(() => () => editorRef.current?.dispose(), [])

    useEffect(() => {
        if (editorElemRef.current !== null && editorRef.current === null) {
            editorRef.current = Editor.create(editorElemRef.current, {
                automaticLayout: true,
                minimap: {
                    enabled: false,
                },
                model: null,
                theme: 'vs-dark',
            })
        }
    }, [editorElemRef.current])

    useEffect(() => {
        if (editorRef.current !== null) {
            setOpenFileModel(editorRef.current)
        }
    }, [openFile])

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

    return <div id="editor-pane" ref={editorElemRef}></div>
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
