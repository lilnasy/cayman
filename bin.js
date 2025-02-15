#!/usr/bin/env node
import { register } from "node:module"

register(import.meta.resolve("./module-hooks.js"))

await import("./cli.ts")
