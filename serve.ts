import { createReadStream } from "node:fs"
import { readdir } from "node:fs/promises"
import { join, relative } from "node:path"
import mime from "mime"
import { serve } from "@hono/node-server"

const staticFiles = new Set()
readdir(join(process.cwd(), "./.cayman/site"), { withFileTypes: true, recursive: true }).then(dirEntries => {
    for (const entry of dirEntries) {
        if (entry.isFile() == false) continue
        staticFiles.add((relative(join(process.cwd(), "./.cayman/site"), entry.parentPath).replaceAll("\\", "/") + "/" + entry.name).replace(/^\/?/, "\/"))
    }
})

serve({
    async fetch(request) {
        const { pathname } = new URL(request.url)
        const staticFile = staticFiles.has(pathname)
        const indexHtml = staticFiles.has(pathname.endsWith("/") ? (pathname + "index.html") : (pathname + "/index.html"))
        if (staticFile || indexHtml) {
            const filePath = join(process.cwd(), ".cayman/site", pathname, indexHtml ? "index.html" : "")
            const contentType = mime.getType(filePath)
            const headers = contentType ? { "Content-Type": contentType } : {}
            return new Response(createReadStream(filePath), { headers })
        }

        const notFoundPath = join(process.cwd(), ".cayman/site/404.html")
        if (staticFiles.has("/404.html")) {
            return new Response(createReadStream(notFoundPath), { 
                status: 404,
                headers: { "Content-Type": "text/html" }
            })
        }
        
        return new Response("Not found", { status: 404 })
    },
    overrideGlobalObjects: false
}, address => console.log(`Server is running on localhost:${address.port}`))
