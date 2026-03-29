import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
    buildSchema,
    type DefinitionNode,
    type DocumentNode,
    GraphQLError,
    type GraphQLSchema,
    type NameNode,
    type OperationDefinitionNode,
    parse,
    validate,
    type VariableDefinitionNode,
} from 'graphql'

const SRC_DIR = 'lib'
const GRAPHQL_DIR = './queries'
const GITHUB_SCHEMA = 'github.graphql'
const GRAPHQL_IGNORE = [GITHUB_SCHEMA, 'README.md']

type UsableOperation = OperationDefinitionNode & { name: NameNode } & {
    loc: Location
}

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
    Object.entries(documents).map(async ([filename, ast], i) => {
        const gqlOut: Array<string> = []
        for (const definition of ast.definitions) {
            if (isUsableOperation(definition, filename, i)) {
                if (definition.name.value.startsWith('_')) continue
                validateQueryName(definition.name.value, filename)
                if (isDefinitionUsingVars(definition)) {
                    gqlOut.push(buildVarsType(definition))
                }
                gqlOut.push(buildGqlString(definition))
            }
        }
        const dest = join(
            SRC_DIR,
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

function isUsableOperation(
    definition: DefinitionNode,
    filename: string,
    index: number,
): definition is UsableOperation {
    if (definition.kind !== 'OperationDefinition')
        throw Error(`node ${index} is not an operation in ${filename}`)
    if (!definition.name)
        throw Error(`operation ${index} is missing name in ${filename}`)
    if (!definition.loc)
        throw Error(
            `operation \`${definition.name.value}\` is missing loc in ${filename}`,
        )
    return true
}

function validateQueryName(queryName: string, filename: string) {
    if (!queryName.startsWith('Q'))
        throw Error(`prepend Q to query \`${queryName}\` in ${filename}`)
}

function isDefinitionUsingVars(
    definition: OperationDefinitionNode,
): definition is UsableOperation & {
    variableDefinitions: Array<VariableDefinitionNode>
} {
    return !!definition.variableDefinitions?.length
}

function buildGqlString(definition: UsableOperation) {
    const query = minify(
        definition.loc.source.body.substring(
            definition.loc.start,
            definition.loc.end,
        ),
    )
    return `export const ${definition.name.value}: string = '${query}'`
}

function buildVarsType(
    operation: OperationDefinitionNode & { name: NameNode } & {
        variableDefinitions: Array<VariableDefinitionNode>
    },
): string {
    const vars: Array<string> = [`export type ${operation.name.value}Vars = {`]
    for (const definition of operation.variableDefinitions) {
        const varName = definition.variable.name.value
        if (definition.type.kind === 'NonNullType') {
            if (definition.type.type.kind === 'NamedType') {
                vars.push(
                    `    ${varName}: ${tsType(definition.type.type.name.value)}`,
                )
                continue
            }
        } else if (definition.type.kind === 'NamedType') {
            vars.push(`    ${varName}?: ${tsType(definition.type.name.value)}`)
            continue
        }
        throw Error('unresolved type of ' + varName)
    }
    vars.push('}')
    return vars.join('\n')
}

function tsType(gqlType: string): string {
    switch (gqlType) {
        case 'String':
            return 'string'
        case 'Int':
            return 'number'
        default:
            throw TypeError()
    }
}

function minify(gql: string): string {
    return gql.replaceAll(/\r?\n/g, ' ').replaceAll(/\s+/g, ' ')
}
