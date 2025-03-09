import type { BuildOptions } from "esbuild"
import type { PluginContext } from "../types.d.ts"

export default function ({ command }: PluginContext) {
    return {
        bundle: true,
        format: "esm",
        legalComments: "linked",
        logLevel: "warning",
        sourcemap: true,
        metafile: true,
        splitting: true,
        treeShaking: true,
        assetNames: "[hash]",
        chunkNames: "[hash]",
        entryNames: "[hash]",
        jsx: "automatic",
        jsxImportSource: "react",
        loader: {
            ".woff2": "file",
        },
        define: {
            "import.meta.dev": command === "dev" ? "true" : "false",
            "process.env.NODE_ENV": command === "dev" ? "'development'" : "'production'",
        }
    } as const satisfies BuildOptions
}
