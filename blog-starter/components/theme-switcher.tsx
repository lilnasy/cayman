/// <reference lib="dom" />
import { useEffect, useState } from "react"
import "./switch.css"

type ColorSchemePreference = "system" | "dark" | "light"

const STORAGE_KEY = "theme"
const modes: ColorSchemePreference[] = ["system", "dark", "light"]

declare global {
    var updateDOM: () => void
}

let updateDOM: () => void

/**
 * Switch button to quickly toggle user preference.
 */
export default function ThemeSwitcher() {
    const [mode, setMode] = useState<ColorSchemePreference>(
        () =>
            ((typeof localStorage !== "undefined" &&
                localStorage.getItem(STORAGE_KEY)) ??
                "system") as ColorSchemePreference,
    )

    useEffect(() => {
        // store global functions to local variables to avoid any interference
        updateDOM = window.updateDOM
        /** Sync the tabs */
        addEventListener("storage", (e: StorageEvent): void => {
            e.key === STORAGE_KEY && setMode(e.newValue as ColorSchemePreference)
        })
    }, [])

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, mode)
        updateDOM()
    }, [mode])

    /** toggle mode */
    const handleModeSwitch = () => {
        const index = modes.indexOf(mode)
        // @ts-ignore
        setMode(modes[(index + 1) % modes.length])
    }

    return <button
        suppressHydrationWarning
        className="switch"
        onClick={handleModeSwitch}
    />
}
