import commonConfig from "./common.ts"
import type { BuildOptions } from "esbuild"
import type { CaymanBundlingContext } from "../types.d.ts"

const defaultBrowserConfig = {
    platform: "browser",
    target: "esnext",
    define: {
        "import.meta.server": "false",
        "import.meta.browser": "true",
    },
} as const satisfies BuildOptions

export default function (ctx: CaymanBundlingContext) {
    const defaultCommonConfig = commonConfig(ctx)
    const { browser: userBrowserConfig, server: _, ...userCommonConfig } = ctx.config ?? {}
    return {
        ...defaultCommonConfig,
        ...defaultBrowserConfig,
        outdir: ctx.command === "dev" ? ".cayman/dev/serve" : ".cayman/site/_cayman",
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
            ...userCommonConfig.define,
            ...userBrowserConfig?.define,
        },
        metafile: true,
    } as const satisfies BuildOptions
}
