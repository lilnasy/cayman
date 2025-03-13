# Cayman

Cayman is a small, hackable framework for a fun web. It focuses on keeping the internals simple, and minimizing unnecessary work.

## Features

- 🚀 **Fast Build Times**: Optimized build process using esbuild.
- 🎯 **Zero-js by default**: You control which components are for templating and which become interactive.
- ⚡ **Instant Preview**: The dev command performs a production build within a second, you won't have to say "but it worked on my machine".

## Quick Start

See the `/blog-starter` directory for an example blog built with Cayman.

```bash
# Create a new project using the blog starter
git clone https://github.com/lilnasy/cayman
cd cayman/blog-starter
npm install
npm run dev
```
The dev command will perform a full production build instantly, watch all the files for changes, and start a server that can be reached at `http://localhost:3000`.

Generate static HTML from your site with the build command:

```bash
npm run build
```

Preview the final build with the serve command:

```bash
npm run serve
```

### Starting a new project

Cayman is not on NPM, it must be installed through GitHub.

```bash
npm init
npm install github:lilnasy/cayman
```

## Project Structure

Cayman will look for the `pages` directory in your project root for tsx files which will be used to render static html. Additionally, it will copy over the `public` directory for static assets. You are free to structure the rest of your project as you want.

```
my-project/
├── pages/           # Page components and routes
│   ├── homepage/
│   │   └── page.tsx
│   ├── about/
│   │   └── page.tsx
│   └── posts/
│       └── [slug]/
│           └── page.tsx
├── public/          # Static assets
└── cayman.config.ts # Framework configuration
```

### Configuration

Cayman is configured through the `cayman.config.ts` file.

```ts
import { defineConfig } from "cayman/config"

export default defineConfig({
    drop: ['console'],
    plugins: [ esbuildTailwind() ],
    browser: {
        target: "chrome100",
    },
    server: {
        sourcemap: true,
    }
})
```

All configuration options are passed directly to esbuild. You can configure server and browser builds separately using the `server` and `browser` fields. See the [esbuild docs](https://esbuild.github.io/api/) for the available options.

### File-based routing

Cayman implements a simple file-based routing system:

- `pages/homepage/page.tsx` → `/index.html`
- `pages/about/page.tsx` → `/about/index.html`
- `pages/posts/[slug]/page.tsx` → `/posts/:slug/index.html`

To keep the implementation simple, and projects predictable, no layout routing is performed. Layout components must be explicitly imported in each page similar to any other component.

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

Interactive components can have the `preload` prop to eagerly load the code required to make the component interactive.

```tsx
import Counter from "../components/Counter.tsx" with { interactive: "true" }
<Counter preload/>
```

Interactive components can have the `defer` prop to delay hydration until the component enters the viewport. This significantly improves initial page load on large pages with several interactive components.

```tsx
import Counter from "../components/Counter.tsx" with { interactive: "true" }
<Counter defer/>
```

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
// pages/posts/[slug]/page.tsx

export async function generateStaticParams() {
  return [
    { slug: 'hello-world' },
    { slug: 'about-cayman' }
  ]
}
```

### CSS Support

Cayman supports CSS imports directly in components:

```tsx
import "../styles/globals.css"
```

The framework can be extended with CSS processors like PostCSS and Tailwind through esbuild plugins. See the [blog-starter configuration](./blog-starter/cayman.config.ts) for an example.

## Commands

- `cayman dev` - Builds your project in watch mode and serves it at `http://localhost:3000`.
- `cayman build` - Generate a static site into the `.cayman/site` directory.
- `cayman serve` - A static file server for `.cayman/site`.

# Make it your own

Most full-stack frameworks are black boxes of brittle complexity. Cayman is designed to be different. The codebase is small and straightforward, and designed to be forked. See [HACKING.md](./HACKING.md) for explanation of the internals.
