export function directoryObjExpr(
    dirpath: string | null,
    ref: string = 'HEAD',
): string {
    return `${ref}:${dirpath?.length ? dirpath : "''"}`
}
