import Footer from "components/footer.tsx"
import ThemeSwitcher from "components/theme-switcher.tsx" with { interactive: "true" }
import NoFOUCScript from "components/no-fouc-script.tsx"
import HeadElements from "cayman/HeadElements"
import "../theme.css"

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode
}>) {
    return <html lang="en">
        <head>
            <link
                rel="apple-touch-icon"
                sizes="180x180"
                href="/favicon/apple-touch-icon.png"
            />
            <link
                rel="icon"
                type="image/png"
                sizes="32x32"
                href="/favicon/favicon-32x32.png"
            />
            <link
                rel="icon"
                type="image/png"
                sizes="16x16"
                href="/favicon/favicon-16x16.png"
            />
            <link rel="manifest" href="/favicon/site.webmanifest" />
            <link
                rel="mask-icon"
                href="/favicon/safari-pinned-tab.svg"
                color="#000000"
            />
            <link rel="shortcut icon" href="/favicon/favicon.ico" />
            <meta name="msapplication-TileColor" content="#000000" />
            <meta
                name="msapplication-config"
                content="/favicon/browserconfig.xml"
            />
            <meta name="theme-color" content="#000" />
            <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
            <HeadElements />
        </head>
        <body className="dark:bg-slate-900 dark:text-slate-400">
            <NoFOUCScript />
            <ThemeSwitcher preload />
            <div className="min-h-screen">{children}</div>
            <Footer />
        </body>
    </html>
}
