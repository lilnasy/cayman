import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { pathToFileURL, fileURLToPath } from "node:url"
import { join } from "node:path"
import mime from "mime"
import { createElement } from "react"
// @ts-ignore
import { renderToReadableStream } from "react-dom/server.edge"
import type { PageOutput } from "./types.d.ts"

/**
 * react-dom does not expose `renderToReadableStream` for node.
 * It is exported for edge runtimes, but importing it directly
 * misses out on the type definitions.
 */
declare const renderToReadableStream: typeof import("react-dom/server").renderToReadableStream

export async function createDevServer(headStorageModulePath: string, pageOutputs: PageOutput[]) {
    const { headStorage } = await loadModule(headStorageModulePath) as typeof import("./runtime/head-storage.ts")
    return {
        async fetch(request: Request) {
            const { pathname } = new URL(request.url)

            if (pathname.includes("/../")) {
                return new Response("Not Found", { status: 404 })
            }

            const [ inPublicFolder, inBuiltFolder ] = await Promise.all(
                ["public", ".cayman/site"]
                    .map(folder => join(process.cwd(), folder + pathname))
                    .map(path => stat(path)
                        .then(stats => stats.isFile() ? path : undefined)
                        .catch(() => undefined)
                    )
            )

            const onDisk = inPublicFolder ?? inBuiltFolder

            if (onDisk) {
                return new Response(createReadStream(onDisk), {
                    headers: {
                        "Content-Type": mime.getType(onDisk) ?? "text/plain"
                    }
                })
            }

            if (pathname === "/_cayman-browser-refresh.js") {
                return new Response(createReadStream(fileURLToPath(import.meta.resolve("./runtime/browser-refresh.js"))), {
                    headers: {
                        "Content-Type": "text/javascript"
                    }
                })
            }

            if (pathname === "/_health") {
                let interval: ReturnType<typeof setInterval>
                return new Response(new ReadableStream({
                    start(controller) {
                        // @ts-ignore
                        controller.enqueue(" ")
                        // @ts-ignore
                        interval = setInterval(() => controller.enqueue(" "), 5000)
                    },
                    cancel() {
                        clearInterval(interval)
                    }
                }))
            }

            const head: Array<{ element: string } & Record<string, string>> = [{
                element: "script",
                type: "module",
                /** Script to reload the page when the server is updated */
                src: "/_cayman-browser-refresh.js"
            }]

            for (const page of pageOutputs) {
                const match = pathname.match(page.regexp)
                if (match) {
                    const pageModule = await loadModule(page.outputPath)
                    const params = match.groups ?? {}
                    if (page.cssUrl) {
                        head.push({ element: "link", rel: "stylesheet", href: page.cssUrl })
                    }
                    const jsxNode = createElement(pageModule.default, { params })
                    const stream = headStorage.run(head, renderToReadableStream, jsxNode)
                    return new Response(await stream, {
                        headers: {
                            "Content-Type": "text/html",
                        },
                    })
                }
            }

            return new Response("Not Found", { status: 404 })
        }
    }
}

async function loadModule(path: string) {
    return await import(String(pathToFileURL(join(process.cwd(), path))))
}
