import { build, context } from "esbuild"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { parseArgs } from "node:util"
import options from "./esbuild-config/server.ts"
import type { Config } from "./config.ts"

const args = parseArgs({ allowPositionals: true })
const [ command ] = args.positionals

const root = process.cwd()

const config: Config =
    await import(pathToFileURL(join(root, "cayman.config.ts")).href).then(m => m.default).catch(() => undefined)
    ?? await import(pathToFileURL(join(root, "cayman.config.js")).href).then(m => m.default).catch(() => undefined)
    ?? {}

if (command === "build") {
    await build(options({ command: "build", config, root }))
} else if (command === "dev") {
    const ctx = await context(options({ command: "dev", config, root }))
    await ctx.watch()
} else if (command === "serve") {
    await import("./serve.ts")
}
