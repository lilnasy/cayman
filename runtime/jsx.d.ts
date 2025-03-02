import "react"

declare module "react" {
    namespace JSX {
        interface IntrinsicAttributes {
            /**
             * When the `preload` attribute is added to a component
             * imported using `with { interactive: "true" }` syntax,
             * all resources required to make the component
             * interactive will be loaded as soon as possible.
             */
            preload?: boolean
            /**
             * When the `defer` attribute is added to a component
             * imported using `with { interactive: "true" }` syntax,
             * the component will be hydrated only when the page is
             * scrolled near the component.
             */
            defer?: boolean
        }
    }
}
