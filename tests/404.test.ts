/// <reference lib="es2024" />
import { test } from "node:test"
import { strictEqual } from "node:assert"
import { existsSync, readFileSync } from "fs"
import { build } from "esbuild"
import options from "../esbuild-config/server.ts"
import { fileURLToPath } from "node:url"
import type { Servable } from "../types.d.ts"

const fixtureRoot = import.meta.resolve("./fixtures/404-pages/");

test.suite("404 page routing", s => {
    test("build generates 404.html", async t => {
        await build(options({ command: "build", root: fileURLToPath(fixtureRoot), testing: {} }))
        const page404Path = new URL(".cayman/site/404.html", fixtureRoot)
        strictEqual(existsSync(page404Path), true, "404.html should be generated");
        const content = readFileSync(page404Path, "utf-8");
        strictEqual(content.includes("404 - Page Not Found"), true, "404 page should contain expected content");
    })

    test("dev server serves 404 response", async t => {
        const { promise, resolve, reject } = Promise.withResolvers<Servable>()

        setTimeout(reject, 1000)

        const [ servable ] = await Promise.all([
            promise,
            await build(options({
                command: "dev",
                root: fileURLToPath(fixtureRoot),
                testing: {
                    resolveDevServable: resolve
                }
            }))
        ])

        const response = await servable.fetch(new Request("http://localhost:8080/non-existent-page"))
        strictEqual(response.status, 404, "Should return 404 status code")
        const content = await response.text()
        strictEqual(content.includes("404 - Page Not Found"), true, "Should return 404 page content")
    })
})
