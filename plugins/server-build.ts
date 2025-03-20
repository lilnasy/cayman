import { mkdirSync, renameSync, rmSync, writeFileSync, copyFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { relative, join } from "node:path"
import { styleText } from "node:util"
import type { Plugin, BuildResult } from "esbuild"
import type { PageOutput, PluginContext } from "../types.d.ts"

export default function (ctx: PluginContext) {
    return {
        name: "server",
        setup(build) {
            build.onStart(() => {
                console.info(styleText("bgGreen", "\n Building server assets..."))
                rmSync(".cayman/builder", { recursive: true, force: true })
                rmSync(".cayman/site", { recursive: true, force: true })
                mkdirSync(".cayman/types", { recursive: true })
                copyFileSync(resolve("../runtime/css-imports.d.ts"),       ".cayman/types/css-imports.d.ts")
                copyFileSync(resolve("../runtime/import-attributes.d.ts"), ".cayman/types/import-attributes.d.ts")
                copyFileSync(resolve("../runtime/import-meta.d.ts"),       ".cayman/types/import-meta.d.ts")
                copyFileSync(resolve("../runtime/jsx.d.ts"),               ".cayman/types/jsx.d.ts")
                function resolve(path: string) {
                    return new URL(import.meta.resolve(path))
                }
            })
            // we want `noExternal: ["cayman"]`, esbuild doesnt have that
            // so we workaround assuming that node_modules is located in cwd/
            build.onResolve({ filter: /^cayman\/HeadElements$/ }, args => {
                return {
                    path: join(process.cwd(), "./node_modules/cayman/runtime/HeadElements.tsx"),
                    external: false
                }
            })
            // package: external also implies css import statements are kept as external
            // we de-externalize them here
            build.onResolve({ filter: /\.css$/ }, async args => {
                if (args.pluginData === "breakloop") {
                    return
                }
                const resolved = await build.resolve(args.path, {
                    kind: args.kind,
                    importer: args.importer,
                    resolveDir: args.resolveDir,
                    pluginData: "breakloop"
                })
                // When packages are configured to externalized, resolving
                // them will result in the path remaining unchanged.
                // So we use import.meta.resolve instead.
                const path = resolved.path === args.path
                    ? fileURLToPath(import.meta.resolve(args.path))
                    : resolved.path
                return {
                    path,
                    external: false,
                }
            })
            build.onEnd(async ({ errors, metafile }: BuildResult) => {
                if (errors.length > 0) {
                    return
                }

                const { outputs } = metafile!
                const pageOutputs: PageOutput[] = []
                const staticFiles: string[] = []

                const headStorageEntrypoint = relative(
                    process.cwd(),
                    fileURLToPath(import.meta.resolve("../runtime/head-storage.ts"))
                ).replaceAll("\\", "/")

                let headStorageOutput: string | undefined = undefined

                mkdirSync(".cayman/site/_cayman", { recursive: true })
                for (const outputPath in outputs) {
                    const output = outputs[outputPath]
                    if (output && output.entryPoint === headStorageEntrypoint) {
                        headStorageOutput = outputPath
                    }
                    if (output && output.entryPoint && output.entryPoint.startsWith("pages")) {
                        const { entryPoint, cssBundle } = output

                        const cssUrl = cssBundle
                            ? cssBundle.replace(".cayman/builder", "/_cayman")
                                       .replace(".cayman/dev", "/_cayman")
                            : undefined

                        const route = entryPoint.replace(/^pages/, "").replace(/\/page\.tsx$/, "")

                        const regexp =
                            "^" +
                            route
                                .replaceAll(/\[\.\.\.([^\]]+)\]/g, (_: string, group: string) => `(?<${group.replace(/^\.\.\./, "")}>.+)`)
                                .replaceAll(/\[([^\]]+)\]/g, (_: string, group: string) =>  `(?<${group}>[^/]+)`)
                                .replaceAll("/", "\\/") +
                            "\\\/?$"

                        pageOutputs.push({
                            route,
                            regexp,
                            outputPath,
                            path: outputPath.replace(".cayman/builder/", "./").replace(".cayman/dev/", "./"),
                            cssUrl,
                        })
                    }

                    if (
                        outputPath.endsWith(".css") ||
                        outputPath.endsWith(".css.map")
                    ) {
                        renameSync(outputPath, outputPath
                            .replace(".cayman/builder", ".cayman/site/_cayman")
                            .replace(".cayman/dev", ".cayman/site/_cayman"))
                        staticFiles.push(outputPath
                            .replace(".cayman/builder", "/_cayman")
                            .replace(".cayman/dev", "/_cayman"))
                    }
                }

                if (pageOutputs.length === 0) {
                    console.error("No pages found, stopping the build.")
                    return
                }

                ctx.serverBuild = {
                    headStorageOutput: headStorageOutput!,
                    pageOutputs,
                }

                if (ctx.command === "dev") {
                    writeFileSync(".cayman/dev/server.js", createServerModule(headStorageOutput!, pageOutputs))
                }
            })
        }
    } satisfies Plugin
}

function createServerModule(headStorageOutput: string, pageOutputs: PageOutput[]) {
    return `
        import { createReadStream } from "node:fs"
        import { Readable } from "node:stream"
        import { readdir } from "node:fs/promises"
        import { relative } from "node:path"
        import { fileURLToPath } from "node:url"
        import { mime } from "cayman/runtime/server"
        import { headStorage } from "../../${headStorageOutput}"
        import { createElement } from "react"
        import { renderToReadableStream } from "react-dom/server.edge"

        const staticFiles = new Set()
        readdir(new URL(import.meta.resolve("../site")), { withFileTypes: true, recursive: true }).then(dirEntries => {
            for (const entry of dirEntries) {
                if (entry.isFile() == false) continue
                staticFiles.add((relative(fileURLToPath(import.meta.resolve("../site")), entry.parentPath).replaceAll("\\\\", "/") + "/" + entry.name).replace(/^\\/?/, "\\/"))
            }
        })

        readdir(new URL(import.meta.resolve("../../public")), { withFileTypes: true, recursive: true }).then(dirEntries => {
            for (const entry of dirEntries) {
                if (entry.isFile() == false) continue
                staticFiles.add((relative(fileURLToPath(import.meta.resolve("../site")), entry.parentPath).replaceAll("\\\\", "/") + "/" + entry.name).replace(/^\\/?/, "\\/"))
            }
        })

        export default {
            async fetch(request) {
                const { pathname } = new URL(request.url)
                if (staticFiles.has(pathname)) {
                    const fileUrl = new URL(import.meta.resolve("../site" + pathname))
                    return new Response(Readable.toWeb(createReadStream(fileUrl)), {
                        headers: {
                            "Content-Type": mime.getType(pathname)
                        }
                    })
                }
                if (pathname === "/_health") {
                    let interval
                    return new Response(new ReadableStream({
                        start(controller) {
                            controller.enqueue(" ")
                            interval = setInterval(() => controller.enqueue(' '), 5000)
                        },
                        cancel() {
                            clearInterval(interval)
                        }
                    }))
                }

                const head = [{
                    element: "script",
                    type: "module",
                    children: [
                        "const res = await fetch('/_health')",
                        "res.text().finally(() => location.reload())"
                    ].join("\\n")
                }]
${
pageOutputs.map(e => `
                {
                    const match = pathname.match(/${e.regexp}/)
                    if (match) {
                        const pageModule = await import("${e.path}")
                        const params = match.groups ?? {}
                        ${e.cssUrl ? `head.push({ element: "link", rel: "stylesheet", href: "${e.cssUrl}" })` : ``}
                        const jsxNode = createElement(pageModule.default, { params })
                        const stream = headStorage.run(head, renderToReadableStream, jsxNode)
                        return new Response(await stream, {
                            headers: {
                                "Content-Type": "text/html",
                            },
                        })
                    }
                }`
).join("")
}
                return new Response("Not Found", { status: 404 })
            }
        }
        `.replaceAll("\n        ", "\n")
}
