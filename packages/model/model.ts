export type Language = 'dart' | 'go' | 'js' | 'rust' | 'zig'

export type Repository = {
    owner: string
    name: string
    stargazerCount: number
    updatedAt: string
}

export type RepositoryId = Pick<Repository, 'owner' | 'name'>

export type Package = {
    name: string
    version: string
    language: Language
    path?: string
    configFile: PackageConfig
    // outputs: Array<PackageOutput>
}

export type PackageConfig =
    | 'pubspec.yaml'
    | 'go.mod'
    | 'package.json'
    | 'Cargo.toml'
    | 'build.zig'

// export type PackageOutput = {
//     kind: 'bin' | 'lib' | 'web'
//     name: string
// }

// export type RepositoryWithPackages = Repository & { packages: Array<Package> }

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
