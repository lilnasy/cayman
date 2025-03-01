/// <reference lib="dom" />
import { hydrateRoot } from "react-dom/client"
import { createElement } from "react"

customElements.define("interactive-component", class extends HTMLElement {
    async connectedCallback() {
        const url = this.getAttribute("url")
        const importName = this.getAttribute("import")
        const serializedProps = this.getAttribute("props")
        const dependencies = this.getAttribute("dependencies")?.split(" ").filter(Boolean)

        if (!url) return

        try {
            dependencies?.map(dep => import(dep))

            const props = serializedProps ? JSON.parse(serializedProps) : {}
            const componentModule = await import(url)
            const Component = importName ? componentModule[importName] : componentModule.default

            if (!Component) {
                console.error(`Component "${importName || "default"}" not found in module ${url}`)
                return
            }
            hydrateRoot(this, createElement(Component, props))
        } catch (error) {
            console.error("Error hydrating component:", error)
        }
    }
})
