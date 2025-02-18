# Cayman

A fast toy framework for building static websites with React. Cayman focuses on build performance, and granular interactivity. See the blog post for more details.

## Features

- 🚀 **Fast Build Times**: Optimized build process using esbuild
- 🎯 **Zero-js by default**: You control when components are interactive.
- ⚡ **Instant Preview**: The dev mode performs a production build within a second, leaving no differences between preview and production.

## Quick Start

See the `/blog-starter` directory for an example blog built with Cayman.

```bash
# Create a new project using the blog starter
git clone https://github.com/lilnasy/cayman
cd cayman/blog-starter
npm install
npm run dev
```
The dev command will start a server that serves your site at `http://localhost:3000`.

Generate static pages from your site with the build command:

```bash
npm run build
```

## Project Structure

Cayman will look for the `pages` directory in your project root for tsx files to render into static html. Additionally, it will copy over the `public` directory for static assets. You are free to structure the rest of your project as you want. 

```
my-project/
├── pages/           # Page components and routes
├── public/          # Static assets
└── cayman.config.ts # Framework configuration
```

### Configuration

Cayman is configured through the `cayman.config.ts` file. There are no configuration options for cayman itself, all options are passed to esbuild. See the [esbuild docs](https://esbuild.github.io/api/) for the available options. You can configure the server and browser build individually with the `server` and `browser` fields.

```ts
import { defineConfig } from "cayman/config"

export default defineConfig({
    drop: ['console'],
    plugins: [ esbuildTailwind() ],
    browser: {
        target: "chrome100",
    },
    server: {
        minify: true,
    }
})
```

### File-based routing

Cayman uses file-based routing similar to Next.js:

- `pages/homepage.tsx` → `/index.html`
- `pages/about.tsx` → `/about/index.html`
- `pages/posts/[slug].tsx` → `/posts/:slug/index.html`

### Interactive Components

Cayman sites don't include any JS code by default. You can make a component interactive by adding the `interactive` attribute to the import:

```tsx
import Layout from "../components/Layout.tsx"
// Import with interactive attribute
import Counter from "../components/Counter.tsx" with { interactive: "true" }

export default function Homepage() {
    return <Layout>
        <Counter />
    </Layout>
}
```

Interactive components can have the `preload` attribute to eagerly load the code required to make the component interactive.

### Layout

Add the `HeadElements` component from the `cayman/HeadElements` module to ensure all necessary scripts and styles are added to the document:

```tsx
import HeadElements from "cayman/HeadElements"

export default function Layout() {
  return (
    <head>
      <title>My Site</title>
      {/* Other head elements */}
      <HeadElements />
    </head>
  )
}
```

### Static Generation

Generate static parameters for dynamic routes:

```tsx
// pages/posts/[slug].tsx

export async function generateStaticParams() {
  return [
    { slug: 'hello-world' },
    { slug: 'about-cayman' }
  ]
}
```

## Commands

- `cayman dev` - Builds your project in watch mode and serves it at `http://localhost:3000`.
- `cayman build` - Generate a static site into the `.cayman/site` directory.
- `cayman serve` - A static file server for `.cayman/site`.


