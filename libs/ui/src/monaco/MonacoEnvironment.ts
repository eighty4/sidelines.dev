import type { Environment } from 'monaco-editor'

// todo use monaco-editor npm version in URL
function getWorkerURL(name: string) {
    return `/lib/monaco/${name}.js`
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
