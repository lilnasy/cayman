import commonConfig from "./common.ts"
import type { BuildOptions } from "esbuild"
import type { PluginContext } from "../types.d.ts"

const defaultBrowserConfig = {
    platform: "browser",
    target: "esnext",
    minify: true,
    outdir: ".cayman/site/_cayman",
    define: {
        "import.meta.server": "false",
        "import.meta.browser": "true",
    },
} as const satisfies BuildOptions

export default function (ctx: PluginContext) {
    const defaultCommonConfig = commonConfig(ctx)
    const { browser: userBrowserConfig, server: _, ...userCommonConfig } = ctx.config ?? {}
    return {
        ...defaultCommonConfig,
        ...defaultBrowserConfig,
        ...userCommonConfig,
        ...userBrowserConfig,
        loader: {
            ...defaultCommonConfig.loader,
            // ...defaultServerConfig.loader,
            ...(userCommonConfig.loader ?? {}),
            ...(userBrowserConfig?.loader ?? {}),
        },
        plugins: [
            ...(userCommonConfig.plugins ?? []),
            ...(userBrowserConfig?.plugins ?? []),
        ],
        define: {
            ...defaultCommonConfig.define,
            ...defaultBrowserConfig.define,
            "process.env.NODE_ENV": "'production'",
            ...userCommonConfig.define,
            ...userBrowserConfig?.define,
        },
        metafile: true,
    } as const satisfies BuildOptions
}
