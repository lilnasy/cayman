import fs from "node:fs"
import { defineConfig } from "cayman/config"
import postcss from "postcss"
import tailwindcss from "@tailwindcss/postcss"

export default defineConfig({
    plugins: [{
        name: "postcss",
        setup(build) {
            const processor = postcss([ tailwindcss() ])
            build.onLoad({ filter: /\.css$/ }, async (args) => {
                const result = await processor.process(fs.readFileSync(args.path, "utf-8"), {
                    from: args.path,
                })
                return {
                    loader: "css",
                    contents:
                        result.map
                            ? result.css + `\n/* #sourceMappingURL=data:application/json;charset=utf-8;base64,${btoa(result.map.toString())} */`
                            : result.css
                }
            })
        }
    }]
})
