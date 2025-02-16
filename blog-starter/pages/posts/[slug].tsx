import Layout from "components/layout.tsx"
import Alert from "components/alert.tsx"
import Container from "components/container.tsx"
import Header from "components/header.tsx"
import PostBody from "components/post-body.tsx"
import PostHeader from "components/post-header.tsx"
import { markdownToHtml } from "lib/markdownToHtml.ts"
import { getAllPosts, getPostBySlug } from "lib/api.ts"

interface Params {
    params: Promise<{
        slug: string
    }>
}

export default async function Post(props: Params) {
    const params = await props.params
    const post = getPostBySlug(params.slug)

    if (!post) {
        return <div>Not found</div>
    }

    const content = await markdownToHtml(post.content || "")

    return <Layout>
        <main>
            <Alert />
            <Container>
                <Header />
                <article className="mb-32">
                    <PostHeader
                        title={post.title}
                        coverImage={post.coverImage}
                        date={post.date}
                        author={post.author}
                    />
                    <PostBody content={content} />
                </article>
            </Container>
        </main>
    </Layout>
}

export async function generateStaticParams() {
    const posts = getAllPosts()

    return posts.map((post) => ({
        slug: post.slug,
    }))
}
