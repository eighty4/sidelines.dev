import type { Environment } from 'monaco-editor'
import sidelinesBuildDefinitions from '../../../../build/definitions.json' with { type: 'json' }

const monacoVersion = sidelinesBuildDefinitions.MONACO_VERSION

function getWorkerURL(name: string) {
    return `/lib/monaco/${name}-${monacoVersion}.js`
}

export const MonacoEnvironment: Environment = {
    // todo look into monaco-yaml npm package
    getWorkerUrl(moduleId: string, label: string) {
        switch (label) {
            case 'editorWorkerService':
                return getWorkerURL('main')
            case 'css':
                return getWorkerURL('css')
            case 'html':
                return getWorkerURL('html')
            case 'json':
                return getWorkerURL('json')
            case 'javascript':
            case 'typescript':
                return getWorkerURL('ts')
            default:
                throw new Error(
                    `MonacoEnvironment.getWorker(${moduleId}, ${label})`,
                )
        }
    },
}
