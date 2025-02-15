import type { Plugin } from "esbuild"
import { mkdir, readdir, copyFile } from "node:fs/promises"
import { join } from "node:path"

export default {
    name: "public-folder",
    setup(build) {
        build.onEnd(async () => {
            await copyDir("public", ".cayman/site")
        })
    }
} satisfies Plugin

async function copyDir(src: string, dest: string) {
    await mkdir(dest, { recursive: true })
    const entries = await readdir(src, { withFileTypes: true })

    for (const entry of entries) {
        const srcPath = join(src, entry.name)
        const destPath = join(dest, entry.name)

        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath)
        } else {
            await copyFile(srcPath, destPath)
        }
    }
}


