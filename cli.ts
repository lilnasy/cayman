import { build, context } from "esbuild"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { parseArgs } from "node:util"
import type { Config } from "./config.ts"
import options from "./esbuild-config/server.ts"

const args = parseArgs({ allowPositionals: true })
const [ command ] = args.positionals

const config: Config =
    await import(pathToFileURL(join(process.cwd(), "cayman.config.ts")).href).then(m => m.default).catch(() => undefined)
    ?? await import(pathToFileURL(join(process.cwd(), "cayman.config.js")).href).then(m => m.default).catch(() => undefined)
    ?? {}

if (command === "build") {
    await build(options({ command: "build", config }))
} else if (command === "dev") {
    const ctx = await context(options({ command: "dev", config }))
    await ctx.watch()
} else if (command === "serve") {
    await import("./serve.ts")
}
