declare module '*.module.css' {
    const identifiers: { [key: string]: string }
    export default identifiers
}

declare module '*.css' {
    const content: string
    export default content
}
