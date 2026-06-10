// import { type FC, lazy, Suspense } from 'react'

export type DiffViewProps = {
    modified: string
    original: string
}

export { default as CodeMirrorDiffView } from './codemirror/CodeMirrorDiffView.tsx'

export { default as MonacoDiffView } from './monaco/MonacoDiffView.tsx'

/*** async bundling of monaco bundling `monaco-editor` CSS does not get added to page ***/
/*** otherwise this module would intend to support async bundling of user selectable UI ***/

// export type EditorKind = 'codemirror' // | 'monaco'

// export type EditorProps = {
//     editor: EditorKind
// }

// const CodeMirrorDiffView = lazy(
//     () => import('./codemirror/CodeMirrorDiffView.tsx'),
// )

// const MonacoDiffView = lazy(() => import('./monaco/MonacoDiffView.tsx'))

// function getEditor(editor: EditorKind): FC<DiffViewProps> {
//     switch (editor) {
//         case 'codemirror':
//             return CodeMirrorDiffView
//         case 'monaco':
//             return MonacoDiffView
//         default:
//             throw TypeError(editor + ' not supported')
//     }
// }

// export const DiffView: FC<DiffViewProps & EditorProps> = ({
//     editor,
//     original,
//     modified,
// }) => {
//     const ActiveDiffView = getEditor(editor)
//     return (
//         <Suspense fallback={<div>Loading!</div>}>
//             <ActiveDiffView
//                 original={original}
//                 modified={modified}
//             />
//         </Suspense>
//     )
// }
