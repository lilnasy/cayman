/// <reference lib="dom" />
import { hydrateRoot } from "react-dom/client"
import { createElement } from "react"

customElements.define("interactive-component", class extends HTMLElement {
    async connectedCallback() {
        const url = this.getAttribute("url")
        const importName = this.getAttribute("import")
        const serializedProps = this.getAttribute("props")
        const defer = this.hasAttribute("defer")
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
            if (defer) {
                io.observe(this)
                this.addEventListener("beforevisible", () => {
                    hydrateRoot(this, createElement(Component, props))
                    io.unobserve(this)
                }, { once: true })
            } else {
                hydrateRoot(this, createElement(Component, props))
            }
        } catch (error) {
            console.error("Error hydrating component:", error)
        }
    }
})

/**
 * Lets the component loader know when the component is scrolled close to the being in the view.
 * Specifically when it is 100% of the viewport's height away from the bottom of the viewport.
 */
const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.dispatchEvent(new Event("beforevisible"))
        }
    })
}, { rootMargin: "100%" })
