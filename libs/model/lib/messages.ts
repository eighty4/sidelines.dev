export function isMessageObject(data: unknown): data is { kind: string } {
    return data !== null && typeof data === 'object' && 'kind' in data
}
