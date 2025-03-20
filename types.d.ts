import type { Config } from "./config.ts"

/**
 * @internal Used by the plugins to share data with each other.
 */
export interface CaymanBundlingContext {
    /**
     * The CLI command that is being executed.
     */
    command: "build" | "dev"
    /**
     * Project root directory.
     */
    root: string
    /**
     * User-provided configuration.
     */
    config?: Config | undefined
    /**
     * Generated after the server build completes.
     */
    serverBuild?: ServerBuild
    /**
     * Testing related objects.
     */
    testing?: {
        resolveDevServable?(servable: Servable): void
    }
}

export interface Servable {
    fetch(request: Request): Promise<Response>
}

interface ServerBuild {
    /**
     * The output of the built module exporting
     * the head storage instance.
     * 
     * Imported by the dev server and the static
     * page generator to render the page.
     */
    headStorageOutput: string
    /**
     * The list of built modules corresponding
     * to pages.
     */
    pageOutputs: PageOutput[]
}

type PageOutput = Page | NotFoundPage

/**
 * A page that does not have special routing considerations.
 */
interface Page {
    type: "normal"
    route: string
    regExp: string
    outputPath: string
    cssUrl: string | undefined
}

/**
 * pages/not-found.tsx
 */
interface NotFoundPage {
    type: "404"
    outputPath: string
    cssUrl: string | undefined
}
