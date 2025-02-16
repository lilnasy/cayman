/// <reference lib="dom" />

const STORAGE_KEY = "theme"

export default function NoFOUCScript() {
    return <script
        dangerouslySetInnerHTML={{
            __html: `(${NoFOUCSetup.toString()})('${STORAGE_KEY}')`,
        }}
    />
}

/** to reuse updateDOM function defined inside injected script */
/** function to be injected in script tag for avoiding FOUC (Flash of Unstyled Content) */
function NoFOUCSetup(storageKey: string) {
    /* can not use outside constants or function as this script will be injected in a different context */
    const [SYSTEM, DARK, LIGHT] = ["system", "dark", "light"]

    /** Modify transition globally to avoid patched transitions */
    const modifyTransition = () => {
        const css = document.createElement("style")
        css.textContent = "*,*:after,*:before{transition:none !important}"
        document.head.appendChild(css)

        return () => {
            /* Force restyle */
            getComputedStyle(document.body)
            /* Wait for next tick before removing */
            setTimeout(() => document.head.removeChild(css), 1)
        }
    }

    const media = matchMedia(`(prefers-color-scheme: ${DARK})`)

    /** function to add remove dark class */
    window.updateDOM = () => {
        const restoreTransitions = modifyTransition()
        const mode = localStorage.getItem(storageKey) ?? SYSTEM
        const systemMode = media.matches ? DARK : LIGHT
        const resolvedMode = mode === SYSTEM ? systemMode : mode
        const classList = document.documentElement.classList
        if (resolvedMode === DARK) classList.add(DARK)
        else classList.remove(DARK)
        document.documentElement.setAttribute("data-mode", mode)
        restoreTransitions()
    }
    window.updateDOM()
    media.addEventListener("change", window.updateDOM)
}
