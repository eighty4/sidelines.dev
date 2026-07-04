export type EncodedValue =
    | ScalarValue
    | {
          a: Array<EncodedValue>
          id: number
      }
    | {
          d: string
      }
    | {
          o: Array<{
              k: string
              v: EncodedValue | ScalarValue
          }>
          id: number
      }
    | {
          v: 'null' | 'undefined'
      }
    | {
          ref: number
      }

type ScalarValue = number | string | boolean

export function toEncodedValue(
    v: any,
    i: number = 1,
    refs: Map<any, number> = new Map(),
): EncodedValue {
    if (v === null) {
        return { v: 'null' }
    }
    switch (typeof v) {
        case 'undefined':
            return { v: 'undefined' }
        case 'boolean':
        case 'number':
        case 'string':
            throw TypeError()
    }
    if (Array.isArray(v)) {
        const ref = refs.get(v)
        if (ref) {
            return { ref }
        } else {
            const id = i++
            refs.set(v, id)
            return {
                a: v.map(av =>
                    isScalar(av) ? av : toEncodedValue(av, i, refs),
                ),
                id,
            }
        }
    }
    if (v instanceof Date) {
        return {
            d: v.toISOString(),
        }
    }
    if (typeof v === 'object') {
        const ref = refs.get(v)
        if (ref) {
            return { ref }
        } else {
            const id = i++
            refs.set(v, id)
            return {
                o: Object.entries(v).map(([k, v]) => ({
                    k,
                    v: isScalar(v) ? v : toEncodedValue(v, i, refs),
                })),
                id,
            }
        }
    }
    throw Error(JSON.stringify(v))
}

function isScalar(v: unknown): v is ScalarValue {
    switch (typeof v) {
        case 'boolean':
        case 'number':
        case 'string':
            return true
        default:
            return false
    }
}

export function fromEncodedValue(
    v: EncodedValue | number | string | null | undefined,
    refs: Record<number, any> = {},
): any {
    if (v === null) {
        return null
    }
    switch (typeof v) {
        case 'boolean':
        case 'number':
        case 'string':
        case 'undefined':
            return v
    }
    if ('d' in v) {
        return new Date(v.d)
    }
    if ('v' in v) {
        switch (v.v) {
            case 'null':
                return null
            case 'undefined':
                return undefined
            default:
                throw TypeError('unexpected {v: ?}: ' + JSON.stringify(v))
        }
    }
    if ('a' in v && Array.isArray(v.a)) {
        return (refs[v.id] = v.a.map(a => fromEncodedValue(a, refs)))
    } else if ('o' in v && Array.isArray(v.o)) {
        return (refs[v.id] = Object.fromEntries(
            v.o.map(({ k, v }) => [k, fromEncodedValue(v, refs)]),
        ))
    } else if ('ref' in v) {
        return refs[v.ref]
    } else {
        throw Error(JSON.stringify(v))
    }
}

// true if object has circular references or a Date, undefined or shared reference
export function shouldEncodeValue(v: any): boolean {
    try {
        JSON.stringify(v)
    } catch {
        return true
    }
    return hasDateUndefinedOrSharedRefs(v, new Set())
}

function hasDateUndefinedOrSharedRefs(v: any, refs: Set<any>): boolean {
    if (v !== null) {
        if (typeof v === 'undefined' || v instanceof Date) {
            return true
        }
        if (Array.isArray(v)) {
            if (refs.has(v)) {
                return true
            } else {
                refs.add(v)
                return v.some(va => hasDateUndefinedOrSharedRefs(va, refs))
            }
        }
        if (typeof v === 'object') {
            if (refs.has(v)) {
                return true
            } else {
                refs.add(v)
                return Object.values(v).some(vv =>
                    hasDateUndefinedOrSharedRefs(vv, refs),
                )
            }
        }
    }
    return false
}
