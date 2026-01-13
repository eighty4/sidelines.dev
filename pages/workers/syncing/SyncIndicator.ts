export class SyncIndicator extends HTMLElement {
    static #template: HTMLTemplateElement | null = null

    static #templateHTML(): string {
        return `\
<template>
<style>
    div {
        position: fixed;
        bottom: 0;
        right: 0;
        height: 2rem;
        width: 2rem;
        background: red;
    }
</style>
<div>
    
</div>
</template>
`
    }

    #shadow: ShadowRoot

    constructor() {
        super()
        this.#shadow = this.attachShadow({ mode: 'open' })
        if (SyncIndicator.#template === null) {
            document.head.insertAdjacentHTML(
                'beforeend',
                SyncIndicator.#templateHTML(),
            )
            SyncIndicator.#template = document.head
                .lastElementChild! as HTMLTemplateElement
        }
        this.#shadow.appendChild(
            SyncIndicator.#template.content.cloneNode(true),
        )
    }
}

customElements.define('sync-indicator', SyncIndicator)
