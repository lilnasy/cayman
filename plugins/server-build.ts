import { mkdirSync, renameSync, rmSync, copyFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { relative, join } from "node:path"
import { styleText } from "node:util"
import type { Plugin, BuildResult } from "esbuild"
import type { PageOutput, CaymanBundlingContext } from "../types.d.ts"

export default function (ctx: CaymanBundlingContext) {
    return {
        name: "server",
        setup(build) {
            build.onStart(() => {
                if (ctx.command === "build") {
                    if (ctx.testing === undefined) {
                        console.info(styleText("bgGreen", "\n Building server assets..."))
                    }
                }
                rmSync(join(ctx.root, ".cayman/builder"), { recursive: true, force: true })
                rmSync(join(ctx.root, ".cayman/site"), { recursive: true, force: true })
                mkdirSync(join(ctx.root, ".cayman/types"), { recursive: true })
                copyFileSync(resolve("../runtime/css-imports.d.ts"),       join(ctx.root, ".cayman/types/css-imports.d.ts"))
                copyFileSync(resolve("../runtime/import-attributes.d.ts"), join(ctx.root, ".cayman/types/import-attributes.d.ts"))
                copyFileSync(resolve("../runtime/import-meta.d.ts"),       join(ctx.root, ".cayman/types/import-meta.d.ts"))
                copyFileSync(resolve("../runtime/jsx.d.ts"),               join(ctx.root, ".cayman/types/jsx.d.ts"))
                function resolve(path: string) {
                    return new URL(import.meta.resolve(path))
                }
            })
            // we want `noExternal: ["cayman"]`, esbuild doesnt have that
            // so we workaround assuming that node_modules is located in cwd/
            build.onResolve({ filter: /^cayman\/HeadElements$/ }, args => {
                return {
                    path: join(ctx.root, "./node_modules/cayman/runtime/HeadElements.tsx"),
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
                    ctx.root,
                    fileURLToPath(import.meta.resolve("../runtime/head-storage.ts"))
                ).replaceAll("\\", "/")

                let headStorageOutput: string | undefined = undefined

                mkdirSync(join(ctx.root, ".cayman/site/_cayman"), { recursive: true })
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

                        if (entryPoint === "pages/not-found.tsx") {
                            pageOutputs.push({
                                type: "404",
                                outputPath,
                                cssUrl,
                            })
                        } else {
                            const route = entryPoint.replace(/^pages/, "").replace(/\/page\.tsx$/, "")
    
                            const regExp =
                                "^" +
                                route
                                    .replaceAll(/\[\.\.\.([^\]]+)\]/g, (_: string, group: string) => `(?<${group.replace(/^\.\.\./, "")}>.+)`)
                                    .replaceAll(/\[([^\]]+)\]/g, (_: string, group: string) =>  `(?<${group}>[^/]+)`)
                                    .replaceAll("/", "\\/") +
                                "\\\/?$"
    
                            pageOutputs.push({
                                type: "normal",
                                route,
                                regExp,
                                outputPath,
                                cssUrl,
                            })
                        }

                    }

                    if (
                        outputPath.endsWith(".css") ||
                        outputPath.endsWith(".css.map")
                    ) {
                        const moveTo = outputPath
                            .replace(".cayman/builder", ".cayman/site/_cayman")
                            .replace(".cayman/dev",     ".cayman/site/_cayman")

                        renameSync(outputPath, join(ctx.root, moveTo))

                        staticFiles.push(outputPath
                            .replace(".cayman/builder", "/_cayman")
                            .replace(".cayman/dev",     "/_cayman")
                        )
                    }
                }

                if (pageOutputs.length === 0) {
                    console.error("No pages found, stopping the build.")
                    return
                }

                if (typeof headStorageOutput !== "string") {
                    throw new Error("Could not find where esbuild output the head storage module. This is a bug in Cayman. Please open an issue describing the conditions that lead to this error.")
                }

                ctx.serverBuild = {
                    headStorageOutput,
                    pageOutputs,
                }
            })
        }
    } satisfies Plugin
}
