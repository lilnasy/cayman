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

export async function generateStaticPages(headStorageOutput: string, pageoutputs: PageOutput[]) {
    const headStorageModule = await import(String(pathToFileURL(join(process.cwd(), "./" + headStorageOutput))))
    const headStorage: AsyncLocalStorage<{}> = headStorageModule.headStorage

    for (const entrypoint of pageoutputs) {
        const pageModule = await import(String(pathToFileURL(join(process.cwd(), "./" + entrypoint.outputPath))))

        let staticParams: Record<string, string>[] = [{}]

        if (entrypoint.route.includes("[")) {
            if (!pageModule.generateStaticParams) {
                console.warn(`Warning: Page ${entrypoint.route} has dynamic parameters but no generateStaticParams export. Skipping...`)
                continue
            }
            staticParams = await pageModule.generateStaticParams()
        }

        for (const params of staticParams) {
            let pagePath = entrypoint.route
            for (const [key, value] of Object.entries(params)) {
                pagePath = pagePath
                    .replace(`[${key}]`, value)
                    .replace(`[...${key}]`, value)
            }

            const head: ({ element: string } & Record<string, string>)[] = []
            if (entrypoint.cssUrl) {
                head.push({
                    element: "link",
                    rel: "stylesheet",
                    href: entrypoint.cssUrl
                })
            }

            const jsxNode = createElement(pageModule.default, { params })
            const { prelude } = await headStorage.run(head, prerender, jsxNode)

            const outputPath = `.cayman/site${pagePath}/index.html`
            mkdirSync(dirname(outputPath), { recursive: true })
            await prelude.pipeTo(Writable.toWeb(createWriteStream(outputPath)))
        }
    }
}
