import { open, readdir } from "node:fs/promises"
import { join, relative } from "node:path"
import mime from "mime"
import { serve } from "@hono/node-server"

const staticFiles = new Set()
readdir(join(process.cwd(), "./.cayman/site"), { withFileTypes: true, recursive: true }).then(dirEntries => {
    for (const entry of dirEntries) {
        if (entry.isFile() == false) continue
        staticFiles.add(prependSlash(relative(join(process.cwd(), "./.cayman/site"), entry.parentPath).replaceAll("\\", "/") + "/" + entry.name))
    }
})

function prependSlash(path: string) {
    return path.startsWith("/") ? path : "/" + path
}

serve({
    async fetch(request) {
        const { pathname } = new URL(request.url)
        const staticFile = staticFiles.has(pathname)
        const indexHtml = staticFiles.has(pathname.endsWith("/") ? (pathname + "index.html") : (pathname + "/index.html"))
        if (staticFile || indexHtml) {
            const filePath = join(process.cwd(), ".cayman/site", pathname, indexHtml ? "index.html" : "")
            const file = await open(filePath)
            const contentType = mime.getType(filePath)
            const headers = contentType ? { "Content-Type": contentType } : {}
            return new Response(file.readableWebStream({ type: "bytes" }), { headers })
        }
        return new Response("Not found", { status: 404 })
    }
}, address => console.log(`Server is running on localhost:${address.port}`))
