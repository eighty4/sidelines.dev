export type FileEntry =
    | {
          type: 'dir'
          // filename
          name: string
          ls: Array<FileEntry>
      }
    | {
          type: 'file'
          // filename
          name: string
          // abs path from root
          path: string
      }

export async function lookupFileEntriesFromRoot(): Promise<Array<FileEntry>> {
    return lookupFileEntries(await navigator.storage.getDirectory(), '')
}

async function lookupFileEntries(
    dir: FileSystemDirectoryHandle,
    dirpath: string,
): Promise<Array<FileEntry>> {
    const entries: Array<FileEntry> = []
    for await (const [name, handle] of dir.entries()) {
        if (handle.kind === 'directory') {
            entries.push({
                type: 'dir',
                name,
                ls: await lookupFileEntries(
                    handle as FileSystemDirectoryHandle,
                    `${dirpath}/${name}`,
                ),
            })
        } else {
            entries.push({ type: 'file', name, path: `${dirpath}/${name}` })
        }
    }
    return entries.sort(sortFileEntries)
}

function sortFileEntries(f1: FileEntry, f2: FileEntry) {
    if (f1.type === 'dir' && f2.type === 'file') {
        return -1
    }
    if (f1.name < f2.name) {
        return -1
    } else if (f1.name > f2.name) {
        return 1
    }
    return 0
}

export async function lookupFileFromRoot(
    path: Array<string>,
): Promise<FileSystemFileHandle> {
    console.log(path)
    let dir = await navigator.storage.getDirectory()
    for (const p of path.slice(0, path.length - 1)) {
        dir = await dir.getDirectoryHandle(p)
    }
    return await dir.getFileHandle(path[path.length - 1])
}
