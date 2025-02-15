import { AsyncLocalStorage } from "node:async_hooks"

export const headStorage = new AsyncLocalStorage()
