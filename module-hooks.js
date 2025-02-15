// @ts-check
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { transformSync } from "esbuild"
import { tmpdir } from "node:os"
/** @import { LoadHook } from "node:module" */
/** @import { TransformOptions, TransformResult } from "esbuild" */

/** @type {LoadHook} */
export function load(url, context, next) {
    const fileUrl = new URL(url)
    const { pathname } = fileUrl

    if (pathname.endsWith(".ts") === false) {
        return next(url, context)
    }

    let source = fs.readFileSync(fileUrl, "utf8")

    /** @type {TransformOptions} */
    const transformOptions = {
        format: "esm",
        loader: "ts",
        sourcefile: url,
        sourcemap: "inline",
        target: "esnext",
    }

    /**
     * Transforming the same file everytime we see it is wasteful.
     * So we save the result of the compilation in a temporary directory.
     * 
     * We generate the name of the file by hashing the source code and the transform options.
     */
    const hash = crypto.hash
        ? crypto.hash("SHAKE-256", source + JSON.stringify(transformOptions), "base64url")
        : crypto.createHash("shake256").update(source + JSON.stringify(transformOptions)).digest("base64url")

    /** @type {TransformResult<typeof transformOptions>} */ 
    let transformed
    /** @type {boolean} */
    let cached

    try {
        transformed = JSON.parse(fs.readFileSync(path.join(tmpdir(), "ts-to-js-cache", `${hash}.json`), "utf8"))
        cached = true
    } catch {
        transformed = transformSync(source, transformOptions)
        cached = false
    }

    if (!cached) {
        fs.mkdirSync(path.join(tmpdir(), "ts-to-js-cache"), { recursive: true })
        fs.writeFileSync(path.join(tmpdir(), "ts-to-js-cache", `${hash}.json`), JSON.stringify(transformed, null, 2))
    }

    return {
        format: "module",
        shortCircuit: true,
        source: transformed.code,
    }
}
