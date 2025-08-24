import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { type DefaultTreeAdapterTypes, parse, serialize } from 'parse5'

type Document = DefaultTreeAdapterTypes.Document
type Element = DefaultTreeAdapterTypes.Element
type ParentNode = DefaultTreeAdapterTypes.ParentNode

export type ImportedScript = {
    type: 'script' | 'style'
    href: string
    elem: Element
    in: string
    out: string
}

export class HtmlEntrypoint {
    static async readFrom(fsPath: string): Promise<HtmlEntrypoint> {
        const html = await readFile(fsPath, 'utf-8')
        return new HtmlEntrypoint(html, fsPath)
    }

    #document: Document
    #fsPath: string
    #scripts: Array<ImportedScript> = []

    constructor(html: string, fsPath: string) {
        this.#document = parse(html)
        this.#fsPath = fsPath
    }

    collectScripts(): Array<ImportedScript> {
        this.#collectScripts(this.#document)
        return this.#scripts
    }

    // rewrites hrefs to content hashed urls
    // for dev call without hrefs to rewrite tsx? ext to js
    rewriteHrefs(hrefs?: Record<string, string>) {
        for (const importScript of this.#scripts) {
            const rewriteTo = hrefs ? hrefs[importScript.in] : null
            if (importScript.type === 'script') {
                if (
                    importScript.in.endsWith('.tsx') ||
                    importScript.in.endsWith('.ts')
                ) {
                    importScript.elem.attrs.find(
                        attr => attr.name === 'src',
                    )!.value = rewriteTo || `/${importScript.out}.js`
                }
            } else if (importScript.type === 'style') {
                importScript.elem.attrs.find(
                    attr => attr.name === 'href',
                )!.value = rewriteTo || `/${importScript.out}.css`
            }
        }
    }

    async writeTo(fsPath: string): Promise<void> {
        await writeFile(fsPath, serialize(this.#document))
    }

    #collectScripts(node: ParentNode) {
        for (const childNode of node.childNodes) {
            if (childNode.nodeName === 'script') {
                const srcAttr = childNode.attrs.find(
                    attr => attr.name === 'src',
                )
                if (srcAttr) {
                    this.#addScript('script', srcAttr.value, childNode)
                }
            } else if (
                childNode.nodeName === 'link' &&
                childNode.attrs.some(
                    attr => attr.name === 'rel' && attr.value === 'stylesheet',
                )
            ) {
                const hrefAttr = childNode.attrs.find(
                    attr => attr.name === 'href',
                )
                if (hrefAttr) {
                    this.#addScript('style', hrefAttr.value, childNode)
                }
            } else if ('childNodes' in childNode) {
                this.#collectScripts(childNode)
            }
        }
    }

    #addScript(type: ImportedScript['type'], href: string, elem: Element) {
        const inPath = join(dirname(this.#fsPath), href)
        const outPath =
            'lib/sidelines/' + inPath.substring(0, inPath.lastIndexOf('.'))

        this.#scripts.push({
            type,
            href,
            elem,
            in: inPath,
            out: outPath,
        })
    }
}
