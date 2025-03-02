#!/usr/bin/env node
import { register } from "node:module"

/**
 * Node.js now supports typescript without compilation but only
 * for modules within the project, not for node_modules.
 *
 * We have esbuild already installed, let's make it process
 * typescript by using Node.js module resolution and load hooks.
 */
register(import.meta.resolve("./module-hooks.js"))

await import("./cli.ts")
