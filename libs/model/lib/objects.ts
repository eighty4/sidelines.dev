// RepositoryObject excludes path to obj in repo
export type RepositoryObject =
    | {
          type: 'dir'
          name: string
      }
    | {
          type: 'file-cat'
          name: string
          size: number
          content: string
      }
    | {
          type: 'file-ls'
          name: string
          size: number
      }
