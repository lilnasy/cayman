import { fileURLToPath } from "node:url"
import server from "../plugins/server-build.ts"
import browser from "../plugins/browser-build.ts"
import commonConfig from "./common.ts"
import publicFolder from "../plugins/public-folder.ts"
import type { BuildOptions } from "esbuild"
import type { PluginContext } from "../types.d.ts"

const defaultServerConfig = {
    platform: "node",
    target: "es2024",
    outdir: ".cayman/builder",
    packages: "external",
    define: {
        "import.meta.server": "true",
        "import.meta.browser": "false",
    },
} as const satisfies BuildOptions

export default function (ctx: PluginContext) {
    const defaultCommonConfig = commonConfig(ctx)
    const { browser: _, server: userServerConfig, ...userCommonConfig } = ctx.config ?? {}
    return {
        ...defaultCommonConfig,
        ...defaultServerConfig,
        ...userCommonConfig,
        ...userServerConfig,
        entryPoints: ["./pages/**/*.tsx", fileURLToPath(import.meta.resolve("../runtime/head-storage.ts"))],
        loader: {
            ...defaultCommonConfig.loader,
            // ...defaultServerConfig.loader,
            ...(userCommonConfig.loader ?? {}),
            ...(userServerConfig?.loader ?? {}),
        },
        plugins: [
            publicFolder,
            server(ctx),
            browser(ctx),
            ...(userCommonConfig.plugins ?? []),
            ...(userServerConfig?.plugins ?? []),
        ],
        define: {
            ...defaultCommonConfig.define,
            ...defaultServerConfig.define,
            ...userCommonConfig.define,
            ...userServerConfig?.define,
        },
        metafile: true,
    } as const satisfies BuildOptions
}
