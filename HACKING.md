# HACKING

This document outlines the project structure and provides guidance for hacking on Cayman to make it work better for you.

## Project Structure

- **[`/esbuild-config/`](#esbuild-config)**: Configuration for the build system
- **[`/plugins/`](#plugins)**: Build plugins and transformation logic
- **[`/runtime/`](#runtime)**: Runtime files for client and server components
- **Root-level files**: Configuration and CLI entry points

### Root-Level Files

- [`bin.js`](./bin.js): Binary entrypoint for the package. Wrapper for `cli.ts`. Registers module hooks allowing Node.js to run TypeScript code directly. Dynamically imports `cli.ts` which includes the actual CLI implementation.
- [`module-hooks.js`](./module-hooks.js): Node.js hooks for loading typescript files, including those in node_modules, allowing Cayman itself to not need a build step.
- [`cli.ts`](./cli.ts): Main CLI implementation.
- [`config.ts`](./config.ts): Implementation of the `cayman/config` module. Exports the `defineConfig` helper function and the `Config` type.
- [`serve.ts`](./serve.ts): Implementation of the `cayman serve` command. Static file server for built sites. Uses Hono's node adapter (without the Hono router) to provide a "fetch-based" HTTP server API. https://github.com/nodejs/node/issues/42529 has some alternatives.
- [`static-generation.ts`](./static-generation.ts): Uses the client and server build output to generate static html files. Implements the logic for `generateStaticParams`. Called by [`plugins/browser-build.ts`](./plugins/browser-build.ts) after the browser build is complete.
- [`tsconfig.json`](./tsconfig.json): TypeScript configuration for building Cayman.
- [`tsconfig.project.json`](./tsconfig.project.json): Recommended TypeScript configuration for projects using Cayman.

### `/esbuild-config/`

Configuration files for esbuild that power Cayman's build process:

- [`browser.ts`](./esbuild-config/browser.ts): Configuration for the browser build.
- [`server.ts`](./esbuild-config/server.ts): Configuration for the server/SSR build.
- [`common.ts`](./esbuild-config/common.ts): Shared configuration between browser and server builds.

### `/plugins/`

Build plugins that handle file transformation and bundle generation:

- [`server-build.ts`](./plugins/server-build.ts): Manages server-side rendering and static generation.
- [`browser-build.ts`](./plugins/browser-build.ts): Handles client-side component bundling and hydration.
- [`public-folder.ts`](./plugins/public-folder.ts): Copies static assets from the `/public` folder to the build output.

### `/runtime/`

Core runtime files that Cayman uses for rendering and hydration:

- [`HeadElements.tsx`](./runtime/HeadElements.tsx): Component that uses `head-storage.ts` to retrieve head elements.
- [`client-component-loader.ts`](./runtime/client-component-loader.ts): Handles loading and hydrating interactive components with a custom element. Implements the logic for `preload` and `defer`.
- [`head-storage.ts`](./runtime/head-storage.ts): The singular `AsyncLocalStorage` instance used to store and retrieve head elements.
- [`serialize-props.ts`](./runtime/serialize-props.ts): Serializes props for hydration, currently a simple `JSON.stringify`.
- [`jsx.d.ts`](./runtime/jsx.d.ts): Type definitions for extensions made to the JSX attributes: `preload`, `defer`, etc.
- [`import-attributes.d.ts`](./runtime/import-attributes.d.ts): Type definitions for the custom import attributes feature (`with { interactive: "true" }`)
- [`css-imports.d.ts`](./runtime/css-imports.d.ts): Type definitions for CSS imports.
- [`import-meta.d.ts`](./runtime/import-meta.d.ts): Type definitions for extensions made to the `import.meta` object.

## Development Workflow

### Setting Up Your Development Environment

1. Clone the repository:
```bash
git clone https://github.com/lilnasy/cayman
cd cayman
```

2. Install dependencies:
```bash
pnpm install
```

3. Build and test with the blog starter:
```bash
cd blog-starter
pnpm run build
```
