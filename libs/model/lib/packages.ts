const LanguageConfigFiles = {
    dart: 'pubspec.yaml',
    go: 'go.mod',
    js: 'package.json',
    rust: 'Cargo.toml',
    zig: 'build.zig',
} as const

export function languageOfConfigFile(filename: string): Language {
    for (const [language, configFile] of Object.entries(LanguageConfigFiles)) {
        if (filename === configFile) {
            return language as Language
        }
    }
    throw Error(filename + ' is not a supported language filename')
}

export type Language = keyof typeof LanguageConfigFiles

export type LanguageConfigFile<L extends Language> =
    (typeof LanguageConfigFiles)[L]

export type RepositoryPackage = Package<Language> | PackageWorkspace<Language>

export type PackageWorkspace<L extends Language> = {
    language: L
    path?: string
    configFile: LanguageConfigFile<L>
    packages: Array<Package<L>>
    root?: Package<L>
}

// todo extend with language specific package data
//  dart -> flutter?
//  js -> package manager | runtime
// todo parse description config filesº
export type Package<L extends Language> = {
    name: string
    version: string
    language: L
    path?: string
    configFile: LanguageConfigFile<L>
    produces?: Array<PackageOutput>
    private?: boolean
}

export type PackageOutput = {
    kind: 'bin' | 'lib'
    // | 'app | 'web' | 'wasm' | 'wasip2' | 'docker-image'
}
