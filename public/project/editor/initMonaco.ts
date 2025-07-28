// todo use monaco-editor version in URL
function getWorkerURL(name: string) {
    return `/lib/monaco/worker/${name}.js`
}

window.MonacoEnvironment = {
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
