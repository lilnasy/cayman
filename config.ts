import type { BuildOptions } from "esbuild"
export type * as esbuild from "esbuild"

export interface Config extends BuildOptions {
    browser?: BuildOptions
    server?: BuildOptions
}

export function defineConfig<T extends Config>(config: T) {
    return config
}
