export async function opfsLookupDir(
    ...paths: Array<string>
): Promise<FileSystemDirectoryHandle> {
    let dirHandle = await navigator.storage.getDirectory()
    const dirOpts = { create: true }
    for (const path of paths) {
        dirHandle = await dirHandle.getDirectoryHandle(path, dirOpts)
    }
    return dirHandle
}

export async function opfsReadFile(
    dirHandle: FileSystemDirectoryHandle,
    filename: string,
): Promise<string | null> {
    try {
        const fileHandle = await dirHandle.getFileHandle(filename)
        const file = await fileHandle.getFile()
        return await file.text()
    } catch (e) {
        if (e instanceof DOMException && e.name === 'NotFoundError') {
            return null
        } else {
            throw e
        }
    }
}

export async function opfsWriteFile(
    dirHandle: FileSystemDirectoryHandle,
    filename: string,
    content: string,
): Promise<void> {
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
    const fileWritable = await fileHandle.createWritable()
    await fileWritable.write(content)
    await fileWritable.close()
}
