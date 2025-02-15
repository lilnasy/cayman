import type { Config } from "./config.ts"

export interface PluginContext {
    command: "build" | "dev"
    config?: Config | undefined
    serverBuild?: ServerBuild
}

interface ServerBuild {
    headStorageOutput: string
    pageOutputs: PageOutput[]
}

interface PageOutput {
    route: string
    regexp: string
    outputPath: string
    path: string
    cssUrl: string | undefined
}
