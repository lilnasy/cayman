import Avatar from "./avatar.tsx"
import CoverImage from "./cover-image.tsx"
import DateFormatter from "./date-formatter.tsx"
import PostTitle from "./post-title.tsx"
import type { Author } from "interfaces/author.ts"

interface Props {
    title: string
    coverImage: string
    date: string
    author: Author
}

export default function PostHeader({ title, coverImage, date, author }: Props) {
    return <>
        <PostTitle>{title}</PostTitle>
        <div className="hidden md:block md:mb-12">
            <Avatar name={author.name} picture={author.picture} />
        </div>
        <div className="mb-8 md:mb-16 sm:mx-0">
            <CoverImage title={title} src={coverImage} />
        </div>
        <div className="max-w-2xl mx-auto">
            <div className="block md:hidden mb-6">
                <Avatar name={author.name} picture={author.picture} />
            </div>
            <div className="mb-6 text-lg">
                <DateFormatter dateString={date} />
            </div>
        </div>
    </>
}
