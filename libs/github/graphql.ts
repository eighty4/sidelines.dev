import {
    buildSchema,
    type DocumentNode,
    type GraphQLSchema,
    parse,
    validate,
    type VariableDefinitionNode,
} from 'graphql'

const graphqlPath = (filename: string) => `./queries/${filename}.graphql`
const jsPath = (filename: string) => `./src/queries/gql/${filename}.ts`
const varsPath = (filename: string) => `./src/queries/vars/${filename}.ts`
const schema: GraphQLSchema = buildSchema(
    await Bun.file(graphqlPath('github')).text(),
)

const documents: Record<string, DocumentNode> = {}
for (const filename of ['repos']) {
    const src = await Bun.file(graphqlPath(filename)).text()
    documents[filename] = parse(src)
}

let invalid = false
for (const [filename, ast] of Object.entries(documents)) {
    const errors = validate(schema, ast)
    if (errors.length) {
        invalid = true
        errors.forEach(e => console.error(`${filename}.graphql`, e))
    }
}

if (invalid) {
    process.exit(1)
} else {
    await Promise.all(
        Object.entries(documents).map(async ([filename, ast]) => {
            const queries: Array<string> = []
            const variables: Array<string> = []
            for (const definition of ast.definitions) {
                if (definition.kind !== 'OperationDefinition') throw Error()
                if (definition.operation !== 'query') throw Error()
                if (!definition.name) throw Error('missing name')
                if (!definition.loc) throw Error('missing loc')

                const queryName = definition.name.value
                if (definition.variableDefinitions?.length) {
                    variables.push(
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
                queries.push(`export const ${queryName}: string = '${query}'`)
            }
            await Bun.write(jsPath(filename), queries.join('\n\n'))
            if (variables.length) {
                await Bun.write(varsPath(filename), variables.join('\n\n'))
            }
        }),
    )
}

function collectVariablesType(
    queryName: string,
    definitions: ReadonlyArray<VariableDefinitionNode>,
): string {
    const vars: Array<string> = [`export type ${queryName}Variables = {`]
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
