export type EncodedValue =
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
              v: EncodedValue
          }>
          id: number
      }
    | {
          v: any
      }
    | {
          ref: number
      }

export function toEncodedValue(
    v: any,
    i: number = 1,
    refs: Map<any, number> = new Map(),
): EncodedValue {
    if (v === null) {
        return { v }
    }
    switch (typeof v) {
        case 'boolean':
        case 'number':
        case 'string':
        case 'undefined':
            return { v }
    }
    if (Array.isArray(v)) {
        const ref = refs.get(v)
        if (ref) {
            return { ref }
        } else {
            const id = i++
            refs.set(v, id)
            return {
                a: v.map(a => toEncodedValue(a, i, refs)),
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
                    v: toEncodedValue(v),
                })),
                id,
            }
        }
    }
    throw Error(JSON.stringify(v))
}

export function fromEncodedValue(
    v: EncodedValue,
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
        return v.v
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
