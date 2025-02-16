import Container from "components/container.tsx"

export default function Alert() {
    return <div
        className="border-b dark:bg-slate-800 bg-neutral-50 border-neutral-200"
    >
        <Container>
            <div className="py-2 text-center text-sm">
                The source code for this blog is{" "}
                <a
                    href="https://github.com/lilnasy/cayman"
                    className="underline hover:text-blue-600 duration-200 transition-colors"
                >
                    available on GitHub
                </a>
                .
            </div>
        </Container>
    </div>
}
