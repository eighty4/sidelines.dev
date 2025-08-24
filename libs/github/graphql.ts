import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
    buildSchema,
    type DocumentNode,
    GraphQLError,
    type GraphQLSchema,
    parse,
    validate,
    type VariableDefinitionNode,
} from 'graphql'

const GRAPHQL_DIR = './queries'
const GITHUB_SCHEMA = 'github.graphql'
const GRAPHQL_IGNORE = [GITHUB_SCHEMA, 'README.md']

// GitHub GraphQL schema to validate against
const schema: GraphQLSchema = buildSchema(
    await readFile(join(GRAPHQL_DIR, GITHUB_SCHEMA), 'utf-8'),
)

const graphqlFiles = (await readdir(GRAPHQL_DIR)).filter(
    (f: string) => !GRAPHQL_IGNORE.includes(f) && !f.startsWith('_'),
)

console.log('found', graphqlFiles.length, '.graphql files')

// error exit before codegen if syntax or schema errors
let abort = false

// keep track of longest filename for result output
let maxGraphqlFilename = 0

function printGraphqlError(filename: string, e: GraphQLError) {
    abort = true
    console.error(filename, e.message)
    e.locations?.forEach(location =>
        console.error(`    at ${location.line}:${location.column}`),
    )
}

// parse and verify graphql syntax
const documents: Record<string, DocumentNode> = {}
for (const filename of graphqlFiles) {
    maxGraphqlFilename = Math.max(maxGraphqlFilename, filename.length)
    const src = await readFile(join(GRAPHQL_DIR, filename), 'utf-8')
    try {
        documents[filename] = parse(src)
    } catch (e) {
        if (e instanceof GraphQLError) {
            printGraphqlError(filename, e)
        } else {
            throw e
        }
    }
}

// validate schema against github.graphql
for (const [filename, ast] of Object.entries(documents)) {
    const errors = validate(schema, ast)
    errors.forEach(e => printGraphqlError(filename, e))
}

if (abort) {
    process.exit(1)
}

const output: Record<string, string> = {}
await Promise.all(
    Object.entries(documents).map(async ([filename, ast]) => {
        const gqlOut: Array<string> = []
        for (const definition of ast.definitions) {
            if (definition.kind !== 'OperationDefinition')
                throw Error('!operation')
            if (definition.operation !== 'query')
                throw Error('operation !query')
            if (!definition.name) throw Error('missing name')
            if (!definition.loc) throw Error('missing loc')

            const queryName = definition.name.value
            if (queryName.startsWith('_')) continue

            if (definition.variableDefinitions?.length) {
                gqlOut.push(
                    collectVariablesType(
                        queryName,
                        definition.variableDefinitions,
                    ),
                )
            }
            const query = minify(
                definition.loc.source.body.substring(
                    definition.loc.start,
                    definition.loc.end,
                ),
            )
            gqlOut.push(`export const ${queryName}: string = '${query}'`)
        }
        const dest = join(
            'src',
            ...filename.substring(0, filename.indexOf('.')).split('_'),
            'gql.ts',
        )
        await writeFile(dest, gqlOut.join('\n\n'))
        output[filename] = dest
    }),
)

console.log('codegen successful:')
for (const filename of Object.keys(output).sort()) {
    console.log(
        filename.padStart(maxGraphqlFilename + 1, ' '),
        '->',
        output[filename],
    )
}

function collectVariablesType(
    queryName: string,
    definitions: ReadonlyArray<VariableDefinitionNode>,
): string {
    const vars: Array<string> = [`export type ${queryName}Vars = {`]
    for (const definition of definitions) {
        const varName = definition.variable.name.value
        if (definition.type.kind === 'NonNullType') {
            if (definition.type.type.kind === 'NamedType') {
                if (definition.type.type.name.value === 'String') {
                    vars.push(`    ${varName}: string`)
                    continue
                }
                if (definition.type.type.name.value === 'Int') {
                    vars.push(`    ${varName}: number`)
                    continue
                }
            }
        } else if (definition.type.kind === 'NamedType') {
            if (definition.type.name.value === 'String') {
                vars.push(`    ${varName}?: string`)
                continue
            }
            if (definition.type.name.value === 'Int') {
                vars.push(`    ${varName}: number`)
                continue
            }
        }
        throw Error('unresolved type of ' + varName)
    }
    vars.push('}')
    return vars.join('\n')
}

function minify(gql: string): string {
    return gql.replaceAll(/\r?\n/g, ' ').replaceAll(/\s+/g, ' ')
}
