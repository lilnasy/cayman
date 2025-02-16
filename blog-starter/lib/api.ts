import fs from "node:fs"
import { join } from "node:path"
import type { Post } from "interfaces/post.ts"
import matter from "gray-matter"

const postsDirectory = join(process.cwd(), "posts")

export function getPostSlugs() {
    return fs.readdirSync(postsDirectory)
}

export function getPostBySlug(slug: string) {
    const realSlug = slug.replace(/\.md$/, "")
    const fullPath = join(postsDirectory, `${realSlug}.md`)
    const fileContents = fs.readFileSync(fullPath, "utf8")
    const { data, content } = matter(fileContents)

    return { ...data, slug: realSlug, content } as Post
}

export function getAllPosts(): Post[] {
    const slugs = getPostSlugs()
    const posts = slugs
        .map((slug) => getPostBySlug(slug))
        // sort posts by date in descending order
        .sort((post1, post2) => (post1.date > post2.date ? -1 : 1))
    return posts
}
