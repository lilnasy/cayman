import { join, relative } from "node:path"
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { styleText } from "node:util"
import options from "../esbuild-config/browser.ts"
import { generateStaticPages } from "./static-generation.ts"
import { serve } from "@hono/node-server"
import { parse } from "es-module-lexer"
import type { Plugin } from "esbuild"
import type { PluginContext } from "../types.d.ts"

export default function (ctx: PluginContext) {
    return {
        name: "islands",
        setup(build) {
            const islands = new Array<{
                /**
                 * The import value of the component.
                 * 
                 * `import { Button } from "./components/Button" with { interactive: "true" }`
                 * The import is "Button".
                 */
                import: string,
                /**
                 * The specifier of the component.
                 * 
                 * `import { Button } from "./components/Button" with { interactive: "true" }`
                 * The specifier is "./components/Button".
                 */
                from: string,
            }>()

            build.onResolve({ filter: /\.(t|j)sx$/, namespace: "file" }, async resolve => {
                if (
                    resolve.kind === "import-statement" &&
                    resolve.with.interactive
                ) {
                    return {
                        path: join(resolve.resolveDir, resolve.path),
                        suffix: "?interactive",
                        pluginData: resolve,
                    }
                }
            })

            build.onResolve({ filter: /\.js$/, namespace: "file" }, resolve => {
                if (resolve.with.external === "true") {
                    return {
                        path: resolve.path,
                        external: true,
                    }
                }
            })

            build.onLoad({ filter: /\.(t|j)sx$/ }, async load => {
                if (load.suffix === "?interactive") {
                    // resolve the file so we can get the exports and turn them
                    // into "islands".
                    // Islands are components that can be referenced by the client.
                    const resolve = await build.resolve(load.pluginData.path, {
                        kind: "import-statement",
                        namespace: "file",
                        importer: load.pluginData.importer,
                        resolveDir: load.pluginData.resolveDir,
                    })
                    const { path } = resolve
                    const { code } = build.esbuild.transformSync(
                        readFileSync(path, "utf-8"), {
                            loader: "tsx",
                        }
                    )
                    const [ , exports ] = parse(code)
                    for (const expor of exports) {
                        islands.push({
                            import: expor.n,
                            from: resolve.path,
                        })
                    }
                    const serverRuntimeSpecifier = fileURLToPath(import.meta.resolve("../runtime/serialize-props.ts")).replaceAll("\\", "/")
                    const absoluteIslandPath = relative(process.cwd(), resolve.path).replaceAll("\\", "/")
                    const imports = [
                        `import { serializeProps } from "${serverRuntimeSpecifier}"`,
                        `import { islandLoader, islandEntrypoints } from "./browser-assets.js" with { external: "true" }\n`,
                    ]
                    const contents = imports.join("\n") + "\n" + exports.flatMap((e, i) => {
                        const componentName = `InteractiveComponent${i === 0 ? "" : String(i)}`
                        const wrapperName = `Hydratable${i === 0 ? "" : String(i)}`
                        return [
                            `import { "${e.n}" as ${componentName} } from "${load.pluginData.path}"`,
                            `function ${wrapperName} ({ preload, ...props}) {`,
                            `    const importName = "${e.n}" === "default" ? null : "${e.n}"`,
                            `    const { url, dependencies } = islandEntrypoints["${absoluteIslandPath}"]`,
                            `    const props_ = Object.keys(props).length > 0 ? serializeProps(props) : null`,
                            `    return <interactive-component import={importName} url={url} props={props_} dependencies={preload ? null : dependencies.join(" ")}>`,
                            `        <${componentName} {...props}/>`,
                            `        <script type="module" src={islandLoader}></script>`,
                            `        {preload && <link rel="modulepreload" href={url} />}`,
                            `        {preload && dependencies.map((dep, i) => <link key={i} rel="modulepreload" href={dep} />)}`,
                            `    </interactive-component>`,
                            `}`,
                            `export { ${wrapperName} as "${e.n}" }`,
                        ]
                    }).join("\n")

                    return {
                        contents,
                        loader: "tsx",
                        resolveDir: load.pluginData.resolveDir,
                    }
                }
            })

            build.onEnd(async serverBuildResult => {
                if (serverBuildResult.errors.length > 0) {
                    return
                }
                if (serverBuildResult.warnings.length > 0) {
                    for (const warning of serverBuildResult.warnings) {
                        if (warning.id === "empty-glob") {
                            return
                        }
                    }
                }

                const islandLoaderEntrypoint = relative(
                    process.cwd(),
                    fileURLToPath(import.meta.resolve("../runtime/island-loader.ts"))
                ).replaceAll("\\", "/")

                console.info(styleText("bgGreen", "\n Building browser assets..."))
                const result = await build.esbuild.build({
                    ...options(ctx),
                    entryPoints: islands.map(i => i.from).concat([islandLoaderEntrypoint]),
                })

                let islandLoaderOutput: string | undefined = undefined
                const islandEntrypoints = new Array<[sourceModuleName: string, chunkName: string, preloadableModules: string[]]>()
                const { outputs } = result.metafile

                for (const output in outputs) {
                    const { entryPoint, imports } = outputs[output]!
                    if (entryPoint) {
                        const publicPath = output.replace(".cayman/site", "")
                        const preloadableModules = new Set<string>()
                        search: {
                            const seen = new Set<string>()
                            const toSearch = imports
                            while (toSearch.length > 0) {
                                const imported = toSearch.pop()
                                if (imported && imported.kind === "import-statement" && outputs[imported.path]) {
                                    seen.add(imported.path)
                                    preloadableModules.add(imported.path.replace(".cayman/site", ""))
                                    for (const impor of outputs[imported.path]!.imports) {
                                        if (seen.has(impor.path) === false) {
                                            toSearch.push(impor)
                                        }
                                    }
                                }
                            }
                        }
                        if (entryPoint === islandLoaderEntrypoint) {
                            islandLoaderOutput = publicPath
                        }
                        else {
                            islandEntrypoints.push([entryPoint, publicPath, Array.from(preloadableModules)])
                        }
                    }
                }
                const browserAssets = [
                    `export const islandLoader = ${JSON.stringify(islandLoaderOutput)}`,
                    "",
                    "export const islandEntrypoints = {",
                    islandEntrypoints.map(([sourceModuleName, chunkName, preloadableModules]) => [
                        `    "${sourceModuleName}": {`,
                        `        url: "${chunkName}",`,
                        `        dependencies: [ ${preloadableModules.map(module => `"${module}"`).join(",")} ]`,
                        `    }`,
                    ].join("\n")).join(",\n"),
                    "}",
                ].join("\n")

                writeFileSync(".cayman/builder/browser-assets.js", browserAssets)

                if (ctx.command === "dev") {
                    restartServer()
                } else if (ctx.command === "build") {
                    console.info(styleText("bgGreen", "\n Generating pages..."))
                    await generateStaticPages(ctx.serverBuild!.headStorageOutput, ctx.serverBuild!.pageOutputs)
                }
            })
        }
    } satisfies Plugin
}

let server: ReturnType<typeof serve> | undefined = undefined
async function restartServer() {
    const serverModule = await import(pathToFileURL(join(process.cwd(), ".cayman/builder/server.js")).href + "?" + Date.now())
    if (server) {
        await new Promise(resolve => server!.close(resolve))
    }
    server = serve(
        { fetch: serverModule.default, overrideGlobalObjects: false },
        address => console.log(`Server is running on ${address.address}:${address.port}`)
    )
}
