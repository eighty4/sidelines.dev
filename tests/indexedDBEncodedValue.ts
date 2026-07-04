export type EncodedValue =
    | {
          a: Array<EncodedValue>
      }
    | {
          d: {
              value: string
          }
      }
    | {
          o: Array<{
              k: string
              v: EncodedValue
          }>
      }
    | {
          v: any
      }

export function toEncodedValue(v: any): EncodedValue {
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
        return {
            a: v.map(toEncodedValue),
        }
    }
    if (typeof v === 'object') {
        return {
            o: Object.entries(v).map(([k, v]) => ({ k, v: toEncodedValue(v) })),
        }
    }
    if (v instanceof Date) {
        return {
            d: { value: v.toISOString() },
        }
    }
    throw Error(JSON.stringify(v))
}

export function fromEncodedValue(v: EncodedValue): any {
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
    if ('a' in v && Array.isArray(v.a)) {
        return v.a.map(fromEncodedValue)
    } else if ('o' in v && Array.isArray(v.o)) {
        return Object.fromEntries(
            v.o.map(({ k, v }) => [k, fromEncodedValue(v)]),
        )
    } else if ('d' in v && typeof v.d === 'string') {
        return new Date(v.d)
    } else if ('v' in v) {
        return v.v
    } else {
        throw Error(JSON.stringify(v))
    }
}
