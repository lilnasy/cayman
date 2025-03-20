import { pathToFileURL } from "node:url"
import { dirname, join } from "node:path"
import { mkdirSync } from "node:fs"
import { createWriteStream } from "node:fs"
import { Writable } from "node:stream"
import type { AsyncLocalStorage } from "node:async_hooks"
import { createElement } from "react"
import type { PageOutput } from "./types.d.ts"

// @ts-ignore
import { prerender } from "react-dom/static.edge"
declare const prerender: typeof import("react-dom/static").prerender

export async function generateStaticPages(root: string, headStorageOutput: string, pageOutputs: PageOutput[]) {
    const headStorageModule = await import(String(pathToFileURL(join(root, "./" + headStorageOutput))))
    const headStorage: AsyncLocalStorage<{}> = headStorageModule.headStorage

    for (const page of pageOutputs) {
        const pageModule = await import(String(pathToFileURL(join(root, "./" + page.outputPath))))

        let staticParams: Record<string, string>[] = [{}]

        if (page.type === "normal" && page.route.includes("[")) {
            if (!pageModule.generateStaticParams) {
                console.warn(`Warning: Page ${page.route} has dynamic parameters but no generateStaticParams export. Skipping...`)
                continue
            }
            staticParams = await pageModule.generateStaticParams()
        }

        for (const params of staticParams) {
            const head: ({ element: string } & Record<string, string>)[] = []
            if (page.cssUrl) {
                head.push({
                    element: "link",
                    rel: "stylesheet",
                    href: page.cssUrl
                })
            }

            let outputPath: string

            if (page.type === "404") {
                outputPath = ".cayman/site/404.html"
            } else if (page.type === "normal") {
                let routeWithParams = ""
                routeWithParams = page.route
                    for (const [key, value] of Object.entries(params)) {
                        routeWithParams = routeWithParams
                            .replace(`[${key}]`, value)
                            .replace(`[...${key}]`, value)
                    }
                outputPath = `.cayman/site${routeWithParams}/index.html`
            } else {
                throw new Error(`Unknown page type`, { cause: page })
            }

            const jsxNode = createElement(pageModule.default, { params })
            const { prelude } = await headStorage.run(head, prerender, jsxNode)

            mkdirSync(dirname(join(root, outputPath)), { recursive: true })
            await prelude.pipeTo(Writable.toWeb(createWriteStream(join(root, outputPath))))
        }
    }
}
