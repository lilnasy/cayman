import type { Config } from "./config.ts"

export interface CaymanBundlingContext {
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
    cssUrl: string | undefined
}
