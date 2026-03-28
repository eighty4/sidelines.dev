export type RepoObjectHistory = {
    oid: string
    authorName: string
    message: string
    authoredDate: string
}

export type RepoObject =
    | {
          kind: 'blob'
          path?: string
          blob: BlobInfo
      }
    | {
          kind: 'tree'
          path?: string
          entries: Array<TreeEntryInfo>
      }

// blob or tree entries within a tree object
export type TreeEntryInfo =
    | {
          kind: 'tree'
          name: string
      }
    | {
          kind: 'blob'
          name: string
          blob: BlobInfo
      }

export type BlobInfo = {
    byteSize: number
    isBinary: boolean
}
