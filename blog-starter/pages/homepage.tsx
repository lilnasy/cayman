import Layout from "components/layout.tsx"
import Container from "components/container.tsx"
import HeroPost from "components/hero-post.tsx"
import Intro from "components/intro.tsx"
import MoreStories from "components/more-stories.tsx"
import { getAllPosts } from "lib/api.ts"

export default function Index() {
    const allPosts = getAllPosts()
    const heroPost = allPosts[0]!
    const morePosts = allPosts.slice(1)

    return <Layout>
        <main>
            <Container>
                <Intro />
                <HeroPost
                    title={heroPost.title}
                    coverImage={heroPost.coverImage}
                    date={heroPost.date}
                    author={heroPost.author}
                    slug={heroPost.slug}
                    excerpt={heroPost.excerpt}
                />
                {morePosts.length > 0 && <MoreStories posts={morePosts} />}
            </Container>
        </main>
    </Layout>
}
