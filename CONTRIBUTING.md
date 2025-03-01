# Contributing to Cayman

This document outlines the project structure and provides guidance for hacking on Cayman to make it work better for you.

## Project Structure

- **[`/esbuild-config/`](#esbuild-config)**: Configuration for the build system
- **[`/plugins/`](#plugins)**: Build plugins and transformation logic
- **[`/runtime/`](#runtime)**: Runtime files for client and server components
- **Root-level files**: Configuration and CLI entry points

### `/esbuild-config/`

Configuration files for esbuild that power Cayman's build process:

- `browser.ts`: Configuration for browser/client-side builds
- `server.ts`: Configuration for server-side rendering
- `common.ts`: Shared configuration between browser and server builds

### `/plugins/`

Build plugins that handle file transformation and bundle generation:

- `browser-build.ts`: Handles client-side component bundling and hydration
- `server-build.ts`: Manages server-side rendering and static generation
- `public-folder.ts`: Copies static assets from the public directory

### `/runtime/`

Core runtime files that Cayman uses for rendering and hydration:

- `HeadElements.tsx`: Component for injecting necessary scripts and styles
- `client-component-loader.ts`: Handles loading and hydrating interactive components
- `head-storage.ts`: Manages storing and retrieving head elements
- `serialize-props.ts`: Serializes props for hydration
- `jsx.d.ts`: JSX type definitions
- `import-attributes.d.ts`: Type definitions for import attributes feature
- `css-imports.d.ts`: Type definitions for CSS imports
- `import-meta.d.ts`: Type definitions for import.meta

### Root-Level Files

- `bin.js`: Binary entrypoint for the package. Wrapper for `cli.ts`. Registers module hooks allowing Node.js to run TypeScript code directly. Dynamically imports `cli.ts` which includes the actual CLI implementation.
- `module-hooks.js`: Node.js hooks for loading typescript files, including those in node_modules, allowing Cayman itself to not need a build step.
- `cli.ts`: Main CLI implementation.
- `config.ts`: Implementation of the `cayman/config` export. Exports the `defineConfig` helper function and the `Config` type.
- `serve.ts`: Static file server for built sites. Uses Hono's node adapter (without the main Hono router/server) to provide a "fetch-based" implementation. https://github.com/nodejs/node/issues/42529 has some alternatives.
- `static-generation.ts`: Imports build result and writes html files using it. Implements `generateStaticParams`.
- `tsconfig.json`: TypeScript configuration for the framework.
- `tsconfig.project.json`: Recommended TypeScript configuration for projects using Cayman.

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
