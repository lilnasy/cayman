import { fileURLToPath } from "node:url"
import server from "../plugins/server-build.ts"
import browser from "../plugins/browser-build.ts"
import commonConfig from "./common.ts"
import publicFolder from "../plugins/public-folder.ts"
import type { BuildOptions } from "esbuild"
import type { CaymanBundlingContext } from "../types.d.ts"

export default function (ctx: CaymanBundlingContext) {
    const defaultCommonConfig = commonConfig(ctx)
    const { browser: _, server: userServerConfig, ...userCommonConfig } = ctx.config ?? {}
    return {
        ...defaultCommonConfig,
        platform: "node",
        target: "es2024",
        outdir: ctx.command === "dev" ? ".cayman/dev" : ".cayman/builder",
        packages: "external",
        ...userCommonConfig,
        ...userServerConfig,
        entryPoints: ["./pages/**/page.tsx", fileURLToPath(import.meta.resolve("../runtime/head-storage.ts"))],
        loader: {
            ...defaultCommonConfig.loader,
            // ...defaultServerConfig.loader,
            ...(userCommonConfig.loader ?? {}),
            ...(userServerConfig?.loader ?? {}),
        },
        plugins: [
            publicFolder(ctx),
            server(ctx),
            browser(ctx),
            ...(userCommonConfig.plugins ?? []),
            ...(userServerConfig?.plugins ?? []),
        ],
        define: {
            ...defaultCommonConfig.define,
            "import.meta.server": "true",
            "import.meta.browser": "false",
            ...userCommonConfig.define,
            ...userServerConfig?.define,
        },
        metafile: true,
    } as const satisfies BuildOptions
}
