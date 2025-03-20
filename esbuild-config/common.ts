import type { BuildOptions } from "esbuild"
import type { CaymanBundlingContext } from "../types.d.ts"

export default function ({ command, root }: CaymanBundlingContext) {
    return {
        bundle: true,
        format: "esm",
        legalComments: "linked",
        logLevel: "error",
        metafile: true,
        splitting: true,
        treeShaking: true,
        sourcemap: command === "dev",
        minify: command === "build",
        absWorkingDir: root,
        assetNames: command === "dev" ? "[name]-[hash]" : "[hash]",
        chunkNames: command === "dev" ? "[name]-[hash]" : "[hash]",
        entryNames: command === "dev" ? "[name]-[hash]" : "[hash]",
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
