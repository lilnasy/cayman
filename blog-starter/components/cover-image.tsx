
interface Props {
    title: string
    src: string
    slug?: string
}

export default function CoverImage({ title, src, slug }: Props) {
    return <div className="sm:mx-0">
        {slug
            ? <a href={`/posts/${slug}`} aria-label={title}>
                <img
                    src={src}
                    alt={`Cover Image for ${title}`}
                    className="shadow-xs w-full hover:shadow-lg transition-shadow duration-200"
                    width={1300}
                    height={630}
                />
            </a>
            : <img
                src={src}
                alt={`Cover Image for ${title}`}
                className="shadow-xs w-full hover:shadow-lg transition-shadow duration-200"
                width={1300}
                height={630}
            />}
    </div>
}
