# A statically generated blog example using Tailwind 4, Markdown, and TypeScript

This example showcases Cayman's Static Generation feature using Markdown files as the data source.

The blog posts are stored in `/posts` as Markdown files with front matter support. Adding a new Markdown file in there will create a new blog post.

To create the blog posts we use [`remark`](https://github.com/remarkjs/remark) and [`remark-html`](https://github.com/remarkjs/remark-html) to convert the Markdown files into an HTML string, and then send it down as a prop to the page. The metadata of every post is handled by [`gray-matter`](https://github.com/jonschlinkert/gray-matter) and also sent in props to the page.

## How to use

Run the dev command to start a local server.
```
pnpm run dev
```

Your blog should be up and running on [http://localhost:3000](http://localhost:3000)! If it doesn't work, post on GitHub discussions.

Run the build command to build the markdown pages into HTML files inside the `.cayman/site` directory.
```
pnpm run build
```

Run the serve command to preview the statically built site.
```
pnpm run serve
```

# Notes

`blog-starter` uses [Tailwind CSS](https://tailwindcss.com) [(v4.0)](https://tailwindcss.com/blog/tailwindcss-v4).
