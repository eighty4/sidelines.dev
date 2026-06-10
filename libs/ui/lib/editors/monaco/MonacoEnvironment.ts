import type { Environment } from 'monaco-editor'

// todo keep in sync with package deps
const MONACO_VERSION = '0.55.1'

function getWorkerURL(name: string) {
    return `/monaco/${MONACO_VERSION}/${name}.js`
}

// todo look into monaco-yaml npm package
export const MonacoEnvironment: Environment = {
    getWorkerUrl(moduleId: string, label: string): string {
        switch (label) {
            case 'editorWorkerService':
                return getWorkerURL('editor.worker')
            case 'css':
                return getWorkerURL('css.worker')
            case 'html':
                return getWorkerURL('html.worker')
            case 'json':
                return getWorkerURL('json.worker')
            case 'javascript':
            case 'typescript':
                return getWorkerURL('ts.worker')
            default:
                throw new Error(
                    `MonacoEnvironment.getWorker(${moduleId}, ${label})`,
                )
        }
    },
}
