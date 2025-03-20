import { join, relative } from "node:path"
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { styleText } from "node:util"
import { serve } from "@hono/node-server"
import { parse } from "es-module-lexer"
import options from "../esbuild-config/browser.ts"
import { generateStaticPages } from "../static-generation.ts"
import { createDevServer } from "../dev-server.ts"
import type { Plugin } from "esbuild"
import type { CaymanBundlingContext, PageOutput } from "../types.d.ts"

export default function (ctx: CaymanBundlingContext) {
    return {
        name: "browser",
        setup(build) {
            /**
             * List of components that are going to run within the browser (in addition to being rendered into static HTML during the build).
             */
            const clientComponents = new Array<{
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
                /**
                 * An ID used to identify the interactive components across the server and browser builds.
                 */
                id: string,
                /**
                 * Whether the component is from an external package.
                 */
                external: boolean
            }>()

            build.onStart(() => { clientComponents.length = 0 })

            build.onResolve({ filter: /.*/, namespace: "file" }, async args => {
                if (args.pluginData === "breakloop") {
                    return
                }
                if (
                    args.kind === "import-statement" &&
                    args.with.interactive
                ) {
                    const resolved = await build.resolve(args.path, {
                        kind: args.kind,
                        importer: args.importer,
                        resolveDir: args.resolveDir,
                        pluginData: "breakloop"
                    })

                    // When packages are configured to externalized, resolving
                    // them will result in the path remaining unchanged.
                    const externalPackage = resolved.path === args.path

                    // So we use import.meta.resolve instead.
                    const path = externalPackage
                        ? fileURLToPath(import.meta.resolve(args.path))
                        : resolved.path

                    return {
                        path,
                        pluginData: { ...args, externalPackage },
                        external: false
                    }
                }
            })

            build.onResolve({ filter: /^BROWSER_ASSETS$/ }, _ => {
                // a timestamp is added to the module specifier
                // to prevent an older, previously-loaded version
                // of the module from being loaded
                return {
                    path: "./browser-assets-manifest.js?" + Date.now(),
                    external: true,
                }
            })

            build.onLoad({ filter: /.*/ }, async load => {
                if (load.with.interactive) {
                    // resolve the file so we can get the exports and turn them
                    // into "clientComponents".
                    // clientComponents are components that can be referenced by the client.
                    const interactiveImports: Omit<typeof clientComponents[number], "id">[] = []
                    const { code } = build.esbuild.transformSync(
                        readFileSync(load.pluginData.importer, "utf-8"), {
                            loader: "tsx",
                        }
                    )
                    const externalPackage = load.pluginData.externalPackage
                    const [ importStatements ] = parse(code)
                    for (const importStatement of importStatements) {
                        if (importStatement.n && importStatement.n === load.pluginData.path) {
                            const specifier = externalPackage ? importStatement.n : load.path.replaceAll("\\", "/")
                            const line = code.slice(importStatement.ss, importStatement.se)
                            // es-module-lexer gives very little information the import statements
                            // so we trick it into reading the line as an export statement
                            // Not Handled: default imports combined with named imports
                            // "import X, { Y } from 'module'"
                            const isDefaultImport = /import\s\*/.test(line) === false && /import\s{/.test(line) === false
                            if (isDefaultImport) {
                                interactiveImports.push({
                                    import: "default",
                                    from: specifier,
                                    external: externalPackage,
                                })
                            }
                            const [ , exports ] = parse(line.replace("import", "export"))
                            for (const exported of exports) {
                                interactiveImports.push({
                                    import: exported.n,
                                    from: specifier,
                                    external: externalPackage,
                                })
                            }
                            break
                        }
                    }
                    const serverRuntimeSpecifier = fileURLToPath(import.meta.resolve("../runtime/serialize-props.ts")).replaceAll("\\", "/")
                    const entrypointId = load.pluginData.externalPackage ? load.pluginData.path : relative(process.cwd(), load.path).replaceAll("\\", "/")

                    const contents = `
                        import { serializeProps } from "${serverRuntimeSpecifier}"
                        import { clientComponentLoader, clientComponents } from "BROWSER_ASSETS"
                        import "cayman/interactive-component.css"
                        `.replaceAll("\n                        ", "\n") + interactiveImports.map((e, i) => {
                        const componentName = `InteractiveComponent${i === 0 ? "" : String(i)}`
                        const wrapperName = `Hydratable${i === 0 ? "" : String(i)}`
                        return `
                            import { "${e.import}" as ${componentName} } from "${e.from}"
                            function ${wrapperName} ({ defer, preload, ...props }) {
                                const importName = "${e.import}" === "default" ? null : "${e.import}"
                                const { url, dependencies } = clientComponents["${entrypointId}"]
                                const props_ = Object.keys(props).length > 0 ? serializeProps(props) : null
                                return <interactive-component import={importName} url={url} props={props_} defer={defer ? "" : null} dependencies={preload ? null : dependencies.join(" ")}>
                                    <${componentName} {...props}/>
                                    <script type="module" src={clientComponentLoader}></script>
                                    {preload && <link rel="modulepreload" href={url} />}
                                    {preload && dependencies.map((dep, i) => <link key={i} rel="modulepreload" href={dep} />)}
                                </interactive-component>
                            }
                            export { ${wrapperName} as "${e.import}" }`.replaceAll("\n                            ", "\n")
                    }).join("\n")

                    clientComponents.push(...interactiveImports.map(e => ({ ...e, id: entrypointId })))

                    return {
                        contents,
                        loader: "tsx",
                        resolveDir: load.pluginData.resolveDir,
                    }
                }
            })

            build.onEnd(async serverBuildResult => {
                if (serverBuildResult.errors.length > 0 || ctx.serverBuild === undefined) {
                    return
                }

                const clientComponentLoaderEntrypoint = relative(
                    process.cwd(),
                    fileURLToPath(import.meta.resolve("../runtime/client-component-loader.ts"))
                ).replaceAll("\\", "/")

                if (ctx.command === "build") {
                    console.info(styleText("bgGreen", "\n Building browser assets..."))
                }

                /**
                 * Map from the IDs used by esbuild as the "entryPoint" to the correseponding client component.
                 */
                const clientComponentsMap = new Map<string, typeof clientComponents[number]>()

                /**
                 * The IDs for project-local components is predictable, so we can pre-populate the map.
                 *
                 * Finding IDs for external components require module resolution with appropriate export
                 * conditions. We let esbuild do all that, and track its choice with a resolve hook.
                 */
                for (const component of clientComponents) {
                    if (component.external === false) {
                        clientComponentsMap.set(component.id, component)
                    }
                }

                const browserBuildOptions = options(ctx)

                const browserBuildResult = await build.esbuild.build({
                    ...browserBuildOptions,
                    plugins: [
                        ...browserBuildOptions.plugins,
                        {
                            name: "external-client-component-entrypoint-tracker",
                            setup(build) {
                                const externalClientComponents = clientComponents.filter(e => e.external === true)
                                if (externalClientComponents.length === 0) {
                                    return
                                }
                                const filter = new RegExp(externalClientComponents.map(e => `^${RegExp.escape(e.id)}$`).join("|"))
                                build.onResolve({ filter }, async resolve => {
                                    if (resolve.pluginData === "breakloop") {
                                        return
                                    }
                                    const resolved = await build.resolve(resolve.path, {
                                        kind: resolve.kind,
                                        importer: resolve.importer,
                                        resolveDir: resolve.resolveDir,
                                        pluginData: "breakloop"
                                    })
                                    clientComponentsMap.set(relative(process.cwd(), resolved.path).replaceAll("\\", "/"), clientComponents.find(e => e.id === resolve.path)!)
                                    return resolved
                                })
                            }
                        }
                    ],
                    entryPoints: clientComponents.map(i => i.id).concat([clientComponentLoaderEntrypoint]),
                })

                if (browserBuildResult.errors.length > 0) {
                    return
                }

                let clientComponentLoaderBuiltChunk: string | undefined = undefined
                const clientComponentBuiltChunks = new Array<[
                    /** A unique name. Must be the same as the one used by the onLoad hook.  */
                    entrypointId: string,
                    /** The path from which the browser can import the component module. */
                    chunkName: string,
                    /** The paths to the modules that the browser should also load when importing the component module. */
                    preloadableModules: string[]
                ]>()
                const { outputs } = browserBuildResult.metafile

                for (const output in outputs) {
                    const { entryPoint, imports } = outputs[output]!
                    const clientComponent = entryPoint && clientComponentsMap.get(entryPoint)
                    if (entryPoint === clientComponentLoaderEntrypoint) {
                        clientComponentLoaderBuiltChunk = output.replace(".cayman/site", "")
                    }
                    if (clientComponent) {
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
                        clientComponentBuiltChunks.push([clientComponent.id, output.replace(".cayman/site", ""), Array.from(preloadableModules)])
                    }
                }
                const browserAssets =
                    `export const clientComponentLoader = ${JSON.stringify(clientComponentLoaderBuiltChunk)}

                    export const clientComponents = {
                    ${clientComponentBuiltChunks.map(([id, chunkName, preloadableModules]) =>
                        `    "${id}": {
                            url: "${chunkName}",
                            dependencies: [ ${preloadableModules.map(module => `"${module}"`).join(",")} ]
                        }`
                    ).join(",\n")}
                    }`.replaceAll("\n                    ", "\n")

                const browserAssetsPath =
                    ctx.command === "dev"
                        ? ".cayman/dev/browser-assets-manifest.js"
                        : ".cayman/builder/browser-assets-manifest.js"

                writeFileSync(browserAssetsPath, browserAssets)

                if (ctx.command === "dev") {
                    restartServer(ctx.serverBuild!.headStorageOutput, ctx.serverBuild!.pageOutputs)
                } else if (ctx.command === "build") {
                    console.info(styleText("bgGreen", "\n Generating pages..."))
                    await generateStaticPages(ctx.serverBuild!.headStorageOutput, ctx.serverBuild!.pageOutputs)
                }
            })
        }
    } satisfies Plugin
}

let server: ReturnType<typeof serve> | undefined = undefined
async function restartServer(headStorageOutput: string, pageOutputs: PageOutput[]) {
    const devServer = await createDevServer(headStorageOutput, pageOutputs)
    if (server) {
        await new Promise(resolve => {
            server!.close(resolve)
            // @ts-ignore
            server!.closeAllConnections()
        })
    }
    server = serve({
        async fetch(request) {
            return await devServer.fetch(request).catch(logFetchError)
        },
        overrideGlobalObjects: false,
    }, address => console.log(`Server is running on http://${address.address === "::" ? "localhost" : address.address}:${address.port}`))
}

declare global {
    interface RegExpConstructor {
        /**
         * The `RegExp.escape()` static method escapes any potential
         * regex syntax characters in a string, and returns a new
         * string that can be safely used as a literal pattern for
         * the `RegExp()` constructor.
         */
        escape: (string: string) => string
    }
}

RegExp.escape ??= function (string: string) {
	return string
		.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
		.replace(/-/g, '\\x2d');
}

function logFetchError(error: Error) {
    console.error(error)
    return new Response(error.message, { status: 500 })
}
