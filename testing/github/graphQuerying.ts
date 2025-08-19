import { type DocumentNode, parse } from 'graphql'

type RegisteredResponse = {
    variables: Record<string, any> | null
    data: any
}

export class GraphqlResponses {
    #responses: Record<string, Array<RegisteredResponse>> = {}

    addQueryResponse(
        queryName: string,
        variables: Record<string, any> | null,
        data: any,
    ) {
        if (!this.#responses[queryName]) {
            this.#responses[queryName] = []
        }
        this.#responses[queryName].push({ variables, data })
    }

    resolveQueryResponse(
        query: string,
        queryVars: Record<string, any> | null,
    ): any {
        let ast: DocumentNode
        try {
            ast = parse(query)
        } catch (e) {
            throw Error('error parsing graphql')
        }
        for (const definition of ast.definitions) {
            if (
                definition.kind === 'OperationDefinition' &&
                definition.operation === 'query'
            ) {
                if (!definition.name) {
                    console.error(
                        'unable to resolve response for query:',
                        query,
                    )
                    throw Error('cannot resolve graphql query response')
                }
                if (!this.#responses[definition.name.value]) {
                    throw Error(
                        `must register a ${definition.name.value} query result`,
                    )
                }
                const match = this.#responses[definition.name.value].find(
                    response => matchVars(queryVars, response.variables),
                )
                if (!match) {
                    throw Error(
                        `must register a ${definition.name.value} query result without variables`,
                    )
                }
                if (!queryVars) {
                    return match.data
                } else {
                    for (const response of this.#responses[
                        definition.name.value
                    ]) {
                        if (matchVars(queryVars, response.variables)) {
                            return response.data
                        }
                    }
                    throw Error(
                        `must register a ${definition.name.value} query result with matching variables`,
                    )
                }
            }
        }
    }
}

function matchVars(
    vars1: Record<string, any> | null,
    vars2: Record<string, any> | null,
): boolean {
    if (vars1 === null && vars2 === null) {
        return true
    }
    if (vars1 === null || vars2 === null) {
        return false
    }
    if (Object.keys(vars1).length !== Object.keys(vars2).length) {
        return false
    }
    for (const [k, v] of Object.entries(vars2)) {
        if (!vars1[k] || vars1[k] !== v) {
            return false
        }
    }
    return true
}
